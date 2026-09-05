/** Source-only course checks; Markdown commands are inspected, never executed. */
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import GithubSlugger from 'github-slugger'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'

const root = fileURLToPath(new URL('../', import.meta.url))
const builtins = new Set(['install', 'exec', 'pack', 'publish', 'audit', 'add', 'why'])

function descendants(node) {
  return [node, ...(node.children ?? []).flatMap(descendants)]
}

function plainText(node) {
  return node.value ?? (node.children ?? []).map(plainText).join('')
}

function parsePage(source) {
  const nodes = descendants(fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] }))
  const slugger = new GithubSlugger()
  const anchors = new Set(nodes.filter(node => node.type === 'heading').map(node => slugger.slug(plainText(node))))
  for (const node of nodes.filter(node => node.type === 'html')) {
    for (const match of node.value.matchAll(/\bid=["']([^"']+)["']/gu)) anchors.add(match[1])
  }
  const definitions = new Map(nodes.filter(node => node.type === 'definition').map(node => [node.identifier, node.url]))
  const links = nodes.flatMap(node => {
    const url = node.type === 'link' || node.type === 'image' ? node.url
      : node.type === 'linkReference' || node.type === 'imageReference' ? definitions.get(node.identifier) : undefined
    return url === undefined ? [] : [url]
  })
  const shell = nodes.filter(node => node.type === 'code' && ['sh', 'shell', 'bash'].includes(node.lang))
  const rows = nodes.filter(node => node.type === 'tableRow').map(node => node.children.map(plainText))
  return { anchors, links, shell, rows }
}

/** Check supplied course sources without filesystem mutation or network access.
 * @param input - Course Markdown, package manifests, and the pinned Node version.
 * @returns Actionable source-level failures; an empty list means these checks pass.
 */
export function checkCourse({ documents, manifests, nodeVersion }) {
  const failures = []
  const pages = new Map([...documents].map(([path, source]) => [path, parsePage(source)]))
  const baseline = pages.get('course/reference/version-baseline.md')
  const row = label => baseline?.rows.find(cells => cells[0] === label)?.[1]
  const workspace = manifests.get('package.json')
  const version = workspace.version
  if (row('DSH 目标') !== version || row('BranchMark 源码版本') !== version) failures.push('course baseline version must match workspace manifests')
  if (row('Node 实测工具链') !== nodeVersion || row('pnpm') !== workspace.packageManager.split('@')[1]) failures.push('course baseline toolchain must match pinned Node and pnpm')
  if (!/^[a-f\d]{40}$/u.test(row('DSH release commit') ?? '')) failures.push('course baseline needs a full DSH release commit')
  for (const [path, manifest] of manifests) {
    if (manifest.version !== version) failures.push(`${path}: version differs from the course baseline`)
  }
  if (workspace.devDependencies['@deepseek-ai/dsh-typert-generator'] !== version) failures.push('course generator version differs from the target DSH')

  const edges = new Map()
  for (const [path, page] of pages) {
    const targets = []
    for (const url of page.links) {
      if (/^(?:[a-z][a-z+.-]*:|\/\/)/iu.test(url)) continue
      let decoded
      try { decoded = decodeURIComponent(url) } catch { failures.push(`${path}: malformed link ${url}`); continue }
      const [destination, fragment] = decoded.split('#', 2)
      const target = destination === '' ? path : posix.normalize(posix.join(posix.dirname(path), destination.split('?', 1)[0]))
      if (!target.startsWith('course/') || !target.endsWith('.md')) continue
      targets.push(target)
      if (!pages.has(target)) failures.push(`${path}: missing course page ${url}`)
      else if (fragment && !pages.get(target).anchors.has(fragment)) failures.push(`${path}: missing heading ${url}`)
    }
    edges.set(path, targets)
    for (const block of page.shell) {
      for (const match of block.value.matchAll(/\bpnpm(?:\s+--filter\s+([\w-]+)|\s+--dir\s+([\w/.-]+))?\s+(?:run\s+)?([a-z][\w:-]*)/gu)) {
        const [, filter, directory, command] = match
        const manifest = filter === undefined ? manifests.get(directory ? `${directory}/package.json` : 'package.json')
          : [...manifests.values()].find(value => value.name === filter)
        if (manifest === undefined) failures.push(`${path}:${block.position.start.line}: unknown package in ${match[0]}`)
        else if (!builtins.has(command) && manifest.scripts?.[command] === undefined) failures.push(`${path}:${block.position.start.line}: missing script ${match[0]}`)
      }
    }
    for (const match of documents.get(path).matchAll(/\bpackages\/(host|client|bundle)\/lib\/[\w.*-]+/gu)) {
      if (match[0].includes('*')) continue
      const manifest = manifests.get(`packages/${match[1]}/package.json`)
      const files = descendantsExports(manifest.exports)
      const local = `./${match[0].split('/').slice(2).join('/')}`
      if (!files.includes(local)) failures.push(`${path}: generated entry is not exported: ${match[0]}`)
    }
  }
  const visited = new Set()
  const pending = ['course/README.md']
  while (pending.length > 0) {
    const path = pending.pop()
    if (visited.has(path)) continue
    visited.add(path)
    pending.push(...edges.get(path) ?? [])
  }
  for (const path of pages.keys()) if (!visited.has(path)) failures.push(`${path}: unreachable from course/README.md`)
  return failures
}

function descendantsExports(value) {
  return typeof value === 'string' ? [value] : Object.values(value ?? {}).flatMap(descendantsExports)
}

async function readCourse(directory) {
  const files = []
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) files.push(...await readCourse(path))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push([path, await readFile(resolve(root, path), 'utf8')])
  }
  return files
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const paths = ['package.json', ...['host', 'client', 'bundle'].map(name => `packages/${name}/package.json`)]
  const manifests = new Map(await Promise.all(paths.map(async path => [path, JSON.parse(await readFile(resolve(root, path), 'utf8'))])))
  const documents = new Map(await readCourse('course'))
  const nodeVersion = (await readFile(resolve(root, '.node-version'), 'utf8')).trim()
  const failures = checkCourse({ documents, manifests, nodeVersion })
  assert.deepEqual(failures, [], `course verification failed:\n${failures.join('\n')}`)
  console.log(`Verified ${documents.size} course pages: baseline, commands, generated entries, anchors, and reachability.`)
}
