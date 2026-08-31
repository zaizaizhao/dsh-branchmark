import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const repositoryUrl = 'git+https://github.com/zaizaizhao/dsh-branchmark.git'
const homepageUrl = 'https://github.com/zaizaizhao/dsh-branchmark#readme'
const issuesUrl = 'https://github.com/zaizaizhao/dsh-branchmark/issues'

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), 'utf8'))
}

const [workspace, host, client, bundle] = await Promise.all([
  readJson('package.json'),
  readJson('packages/host/package.json'),
  readJson('packages/client/package.json'),
  readJson('packages/bundle/package.json'),
])

assert.equal(workspace.private, true, 'the workspace root must never be published')
for (const manifest of [host, client]) {
  assert.equal(manifest.private, true, `${manifest.name} is a private implementation workspace`)
  assert.equal(manifest.publishConfig, undefined, `${manifest.name} must not expose publish configuration`)
}

assert.equal(bundle.private, undefined, 'the installable bundle must remain publishable')
assert.deepEqual(bundle.publishConfig, { access: 'public' })
assert.equal(bundle.license, 'MIT')
assert.equal(bundle.author, 'zaizaizhao')
assert.deepEqual(bundle.repository, {
  type: 'git',
  url: repositoryUrl,
  directory: 'packages/bundle',
})
assert.equal(bundle.homepage, homepageUrl)
assert.deepEqual(bundle.bugs, { url: issuesUrl })
assert.equal(bundle.dsh?.bundle?.patch, './cordis.patch.yml')
assert.equal(bundle.dsh?.client?.platform, 'web')
assert.equal(bundle.exports?.['./client'], './lib/client.js')
assert.ok(bundle.files.includes('lib/client.js'))
assert.ok(bundle.files.includes('lib/types-*.d.ts'))
assert.equal(bundle.files.includes('lib'), false, 'the public package must not include every build artifact')

const versions = [workspace, host, client, bundle].map(manifest => manifest.version)
assert.deepEqual(versions, Array(4).fill(bundle.version), 'all workspace versions must match the public bundle')

const injectedPackages = bundle.dsh.client.inject
assert.ok(Array.isArray(injectedPackages) && injectedPackages.length > 0)
for (const name of injectedPackages) {
  assert.equal(typeof bundle.peerDependencies?.[name], 'string', `${name} must be a public peer`)
  assert.equal(typeof bundle.devDependencies?.[name], 'string', `${name} must be available to the bundle build`)
}
for (const name of Object.keys(bundle.peerDependencies)) {
  assert.deepEqual(
    bundle.peerDependenciesMeta?.[name],
    { optional: true },
    `${name} is supplied by the compatible DSH profile and must be an optional install peer`,
  )
}

for (const lifecycle of ['preinstall', 'install', 'postinstall', 'prepare']) {
  assert.equal(bundle.scripts?.[lifecycle], undefined, `public package must not run ${lifecycle}`)
}

const requiredFiles = [
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/workflows/ci.yml',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md',
  'RELEASING.md',
  'SECURITY.md',
  'course/README.md',
  'docs/ARCHITECTURE.md',
  'docs/PRD.md',
  'packages/bundle/LICENSE',
  'packages/bundle/README.md',
  'packages/bundle/cordis.patch.yml',
]
await Promise.all(requiredFiles.map(path => access(new URL(path, root))))

const packageReadme = await readFile(new URL('packages/bundle/README.md', root), 'utf8')
for (const text of [
  'dsh plugin --profile web add dsh-branchmark',
  'dsh plugin --profile web remove dsh-branchmark',
  '0.1.2-alpha.2',
  'clip_explorer',
  'SECURITY.md',
  'GitHub source specifier',
]) {
  assert.ok(packageReadme.includes(text), `package README must document ${JSON.stringify(text)}`)
}

console.log('Verified BranchMark publication metadata, package boundaries, peer declarations, and release files.')
