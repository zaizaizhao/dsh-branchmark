/** Negative controls for independent plugin releases with one exact DSH target. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyReleaseVersions } from './verify-release-versions.mjs'

const generator = '@deepseek-ai/dsh-typert-generator'
const peer = '@deepseek-ai/dsh-session'

function candidate() {
  const manifests = [
    { version: '0.1.2-rc.2', devDependencies: { [generator]: '0.1.2-rc.1' } },
    { version: '0.1.2-rc.2' },
    { version: '0.1.2-rc.2' },
    { version: '0.1.2-rc.2', peerDependencies: { [peer]: 'catalog:' } },
  ]
  return { manifests, installed: { [generator]: '0.1.2-rc.1', [peer]: '0.1.2-rc.1' } }
}

test('a plugin release can advance while its DSH target stays pinned', () => {
  const { manifests, installed } = candidate()
  assert.doesNotThrow(() => verifyReleaseVersions(manifests, installed))
})

test('a private workspace cannot retain an older plugin version', () => {
  const { manifests, installed } = candidate()
  manifests[1].version = '0.1.2-rc.1'
  assert.throws(() => verifyReleaseVersions(manifests, installed), /all workspace versions/)
})

test('an installed DSH peer cannot follow the plugin version', () => {
  const { manifests, installed } = candidate()
  installed[peer] = '0.1.2-rc.2'
  assert.throws(
    () => verifyReleaseVersions(manifests, installed),
    /dsh-session must match the pinned DSH target/,
  )
})

test('the generator declaration must be an exact installed version', () => {
  const { manifests, installed } = candidate()
  manifests[0].devDependencies[generator] = '^0.1.2-rc.1'
  assert.throws(() => verifyReleaseVersions(manifests, installed), /dsh-typert-generator must match/)
})

test('a missing installed peer cannot bypass target verification', () => {
  const { manifests, installed } = candidate()
  delete installed[peer]
  assert.throws(() => verifyReleaseVersions(manifests, installed), /dsh-session must match/)
})
