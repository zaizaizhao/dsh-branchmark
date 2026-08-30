import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { extname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const ignoredDirectories = new Set(['.playwright-mcp', 'dist', 'lib', 'node_modules'])
const textExtensions = new Set(['.json', '.md', '.mjs', '.ts', '.tsx', '.yaml', '.yml'])
const forbiddenIdentities = [
  ['dsh', 'clip', 'explorer'].join('-'),
  ['Clip', 'Explorer'].join(' '),
  ['clip', 'explorer'].join('-'),
  ['clip', 'Explorer'].join(''),
  ['Clip', 'Explorer'].join(''),
  ['dce', ''].join('-'),
]
const retiredUiTerms = [
  ['DSH', 'BranchMark'].join(' '),
  ['摘录', '库'].join(''),
  ['本会话', '摘录'].join(''),
  ['项目', '摘录'].join(''),
  ['摘录', 'Dock'].join(' '),
  ['摘录', '·'].join(' '),
  ['引用', '摘录'].join(''),
]

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) files.push(...await collect(path))
    else if (entry.isFile() && textExtensions.has(extname(entry.name))) files.push(path)
  }
  return files
}

const files = await collect(root)
for (const path of files) {
  const projectPath = relative(root, path)
  for (const identity of forbiddenIdentities) {
    assert.equal(projectPath.includes(identity), false, `${projectPath} retains the previous product identity`)
  }
  const source = await readFile(path, 'utf8')
  for (const identity of forbiddenIdentities) {
    assert.equal(source.includes(identity), false, `${projectPath} retains the previous product identity: ${identity}`)
  }
  for (const term of retiredUiTerms) {
    assert.equal(source.includes(term), false, `${projectPath} retains retired product wording: ${term}`)
  }
}

const readJson = async path => JSON.parse(await readFile(`${root}/${path}`, 'utf8'))
const manifests = await Promise.all([
  readJson('package.json'),
  readJson('packages/host/package.json'),
  readJson('packages/client/package.json'),
  readJson('packages/bundle/package.json'),
])
assert.deepEqual(manifests.map(manifest => manifest.name), [
  'dsh-branchmark-workspace',
  'dsh-branchmark-host',
  'dsh-branchmark-client',
  'dsh-branchmark',
])
assert.deepEqual(manifests.map(manifest => manifest.version), Array(4).fill('0.3.0'))

const readme = await readFile(`${root}/README.md`, 'utf8')
assert.ok(readme.startsWith(`# 枝签 · BranchMark\n\n> 摘一段，生一枝。\n\nExcerpt-driven session branching and conversation lineage for DeepSeek Harness.\n`))

console.log('Verified BranchMark package identity, source namespaces, and product wording.')
