/** Keep BranchMark publication versions separate from the pinned DSH dependency target. */
import assert from 'node:assert/strict'

/** Reject inconsistent workspace versions or installed DSH packages.
 * @param manifests - Root, Host, Client, and public Bundle manifests.
 * @param installedDshVersions - Installed versions for the generator and every public DSH peer.
 */
export function verifyReleaseVersions(manifests, installedDshVersions) {
  const [workspace, , , bundle] = manifests
  const versions = manifests.map((manifest) => manifest.version)
  assert.deepEqual(
    versions,
    Array(4).fill(bundle.version),
    'all workspace versions must match the public bundle',
  )

  const generator = '@deepseek-ai/dsh-typert-generator'
  const targetDshVersion = workspace.devDependencies[generator]
  assert.equal(typeof targetDshVersion, 'string', 'the generator must pin a DSH release')
  const packages = [
    generator,
    ...Object.keys(bundle.peerDependencies).filter((name) => name.startsWith('@deepseek-ai/dsh-')),
  ]
  for (const name of packages) {
    assert.equal(
      installedDshVersions[name],
      targetDshVersion,
      `${name} must match the pinned DSH target ${targetDshVersion}`,
    )
  }
}
