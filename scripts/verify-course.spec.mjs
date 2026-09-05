/** Pure fixtures prove that the course checker rejects stale teaching inputs. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkCourse } from './verify-course.mjs'

function fixture() {
  const version = '0.1.2-rc.1'
  return {
    nodeVersion: '24.19.0',
    documents: new Map([
      ['course/README.md', '# Course\n\n[Baseline](reference/version-baseline.md)\n\n[Lesson](tutorials/example.md#目标与-code)\n'],
      ['course/reference/version-baseline.md', `# Baseline\n\n| 项目 | 固定值 |\n| --- | --- |\n| DSH 目标 | ${version} |\n| BranchMark 源码版本 | ${version} |\n| Node 实测工具链 | 24.19.0 |\n| pnpm | 11.7.0 |\n| DSH release commit | ${'a'.repeat(40)} |\n`],
      ['course/tutorials/example.md', '# Lesson\n\n## 目标与 `code`\n\n```sh\npnpm run check\npnpm --filter dsh-branchmark-host test\n```\n'],
    ]),
    manifests: new Map([
      ['package.json', { name: 'workspace', version, packageManager: 'pnpm@11.7.0', scripts: { check: 'test' }, devDependencies: { '@deepseek-ai/dsh-typert-generator': version } }],
      ['packages/host/package.json', { name: 'dsh-branchmark-host', version, scripts: { test: 'vitest run' }, exports: { './remote': { types: './lib/typert.remote-client.d.ts' } } }],
    ]),
  }
}

test('accepts the pinned course and Chinese headings with inline code', () => {
  assert.deepEqual(checkCourse(fixture()), [])
})

for (const [name, mutate, diagnostic] of [
  ['stale baseline', value => { value.documents.set('course/reference/version-baseline.md', value.documents.get('course/reference/version-baseline.md').replaceAll('0.1.2-rc.1', '0.1.2-alpha.5')) }, 'baseline version'],
  ['wrong Node', value => { value.nodeVersion = '22.19.0' }, 'toolchain'],
  ['wrong package version', value => { value.manifests.get('packages/host/package.json').version = 'old' }, 'version differs'],
  ['wrong generator', value => { value.manifests.get('package.json').devDependencies['@deepseek-ai/dsh-typert-generator'] = 'old' }, 'generator version'],
  ['nonexistent generate script', value => { value.documents.set('course/tutorials/example.md', '# Lesson\n\n## 目标与 `code`\n\n```sh\npnpm --filter dsh-branchmark-host generate\n```\n') }, 'missing script'],
  ['nonexistent filter package', value => { value.documents.set('course/tutorials/example.md', '```sh\npnpm --filter missing test\n```') }, 'unknown package'],
  ['stale generated filename', value => { value.documents.set('course/tutorials/example.md', 'packages/host/lib/remote-map.d.ts') }, 'generated entry'],
  ['broken fragment', value => { value.documents.set('course/tutorials/example.md', '# Different\n') }, 'missing heading'],
  ['missing destination', value => { value.documents.delete('course/tutorials/example.md') }, 'missing course page'],
  ['orphan chapter', value => { value.documents.set('course/orphan.md', '# Orphan\n') }, 'unreachable'],
]) {
  test(`rejects ${name}`, () => {
    const value = fixture()
    mutate(value)
    assert.ok(checkCourse(value).some(error => error.includes(diagnostic)))
  })
}

test('uses GFM duplicate heading anchors and reference-style links', () => {
  const value = fixture()
  value.documents.set('course/tutorials/example.md', '# Lesson\n\n## 目标与 `code`\n\n## 目标与 `code`\n\n[again][target]\n\n[target]: #目标与-code-1\n')
  assert.deepEqual(checkCourse(value), [])
})

test('does not execute shell text or follow links inside a Markdown example', () => {
  const value = fixture()
  value.documents.set('course/tutorials/example.md', '# Lesson\n\n## 目标与 `code`\n\n```markdown\n[not a link](missing.md)\n```\n\n```sh\nthrow-if-executed\n```\n')
  assert.deepEqual(checkCourse(value), [])
})
