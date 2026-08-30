import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const ignoredDirectories = new Set(['.git', '.playwright-mcp', 'dist', 'lib', 'node_modules'])

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collect(path))
    else if (entry.isFile() && extname(entry.name) === '.md') files.push(path)
  }
  return files
}

function localDestination(raw) {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed.startsWith('#')) return undefined
  if (/^(?:[a-z][a-z+.-]*:|\/\/)/iu.test(trimmed)) return undefined
  const destination = trimmed.startsWith('<')
    ? trimmed.slice(1, trimmed.indexOf('>'))
    : trimmed.split(/\s+["']/u, 1)[0]
  if (destination === undefined) return undefined
  const withoutFragment = destination.split('#', 1)[0]?.split('?', 1)[0]
  if (withoutFragment === undefined || withoutFragment === '') return undefined
  return decodeURIComponent(withoutFragment)
}

const failures = []
for (const path of await collect(root)) {
  const source = await readFile(path, 'utf8')
  let fenced = false
  for (const [index, line] of source.split('\n').entries()) {
    if (/^\s*(?:```|~~~)/u.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const destinations = [
      ...line.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu),
      ...line.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gu),
    ].map(match => match[1]).filter(value => value !== undefined)
    for (const raw of destinations) {
      const destination = localDestination(raw)
      if (destination === undefined) continue
      const target = destination.startsWith('/') ? resolve(root, `.${destination}`) : resolve(dirname(path), destination)
      try {
        await access(target)
      } catch {
        failures.push(`${relative(root, path)}:${String(index + 1)} -> ${destination}`)
      }
    }
  }
}

assert.deepEqual(failures, [], `broken local Markdown links:\n${failures.join('\n')}`)
console.log('Verified local Markdown link targets.')
