import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const bundleRoot = new URL('../packages/bundle/', import.meta.url)
const outputNames = ['index.js', 'typert.host.js', 'typert.remote-client.js', 'client.js']
const outputs = await Promise.all(outputNames.map(async name => [
  name,
  await readFile(new URL(`lib/${name}`, bundleRoot), 'utf8'),
]))

for (const [name, source] of outputs) {
  assert.doesNotMatch(
    source,
    /(?:from\s+|import\s*\()\s*['"]dsh-branchmark-host(?:\/[^'"]*)?['"]/,
    `${name} still imports the private source workspace`,
  )
}

const hostModule = await import(new URL('lib/index.js', bundleRoot).href)
assert.equal(hostModule.default?.name, 'BranchMarkService')

const typertModule = await import(new URL('lib/typert.host.js', bundleRoot).href)
assert.equal(typertModule.TYPERT.package, 'dsh-branchmark')
assert.equal(typertModule.TYPERT.invocations.length, 14)

const client = outputs.find(([name]) => name === 'client.js')?.[1]
assert.ok(client?.includes('window.__ModuleLoader__.load'), 'client.js is not a DSH browser module')
assert.match(client ?? '', /ctx\.inject\(\["remote\.branchmark"\]/)
assert.match(client ?? '', /registerSource/)
assert.doesNotMatch(client ?? '', /conversation\.input\.dock/)
assert.doesNotMatch(
  client ?? '',
  /dbmDockSafeArea|data-dbm-dock-safe-area|dbm-dock-safe-width/,
  'the Clip Dock must not resize the DSH conversation layout',
)
assert.match(client ?? '', /dbm-side-primary/)
assert.match(client ?? '', /--dsw-alias-button-info-fill/)
assert.match(client ?? '', /dbm-selection-action/)
assert.match(client ?? '', /摘录到会话/)
assert.match(client ?? '', /摘录到项目/)
assert.match(client ?? '', /Ask in side/)
assert.match(client ?? '', /处理/)
assert.match(client ?? '', /引用到输入框/)
assert.match(client ?? '', /移入回收站/)
assert.doesNotMatch(client ?? '', /继续探索/)
assert.match(client ?? '', /枝签/)
assert.match(client ?? '', /dsh-branchmark\.ui\.v1/)
assert.doesNotMatch(client ?? '', /保存到本会话/)
assert.doesNotMatch(client ?? '', new RegExp([
  ['摘录', '库'].join(''),
  ['摘录', '·'].join(' '),
  ['dce', ''].join('-'),
].join('|')))
assert.doesNotMatch(
  client ?? '',
  /onClick:\s*stop\s*[,}]/,
  'BranchMark controls must not bind the browser stop() global',
)

const manifest = JSON.parse(await readFile(new URL('package.json', bundleRoot), 'utf8'))
assert.equal(manifest.name, 'dsh-branchmark')
assert.equal(manifest.version, '0.1.2-alpha.5')
assert.equal(manifest.description, 'Excerpt-driven session branching and conversation lineage for DeepSeek Harness')
const exportTargets = Object.values(manifest.exports).flatMap((value) => (
  typeof value === 'string' ? [value] : Object.values(value)
))
for (const target of exportTargets) {
  assert.equal(typeof target, 'string')
  await readFile(new URL(target, bundleRoot))
}

console.log('Verified self-contained Host, Typert, Remote, and browser bundle outputs.')
