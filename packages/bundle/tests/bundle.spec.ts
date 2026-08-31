import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import manifest from '../package.json'

describe('installable BranchMark bundle', () => {
  it('declares one resolvable Host row and its own browser face', async () => {
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(manifest.dsh.client.platform).toBe('web')
    expect(manifest.dsh.client.inject).toEqual([
      '@deepseek-ai/dsh-api-gateway',
      '@deepseek-ai/dsh-api-session-controller',
      '@deepseek-ai/dsh-api-workspace-controller',
      '@deepseek-ai/dsh-client-locale',
      '@deepseek-ai/dsh-client-ui-layout',
      '@deepseek-ai/dsh-client-ui-sidebar',
      '@deepseek-ai/dsh-client-ui-renderer',
      '@deepseek-ai/dsh-client-ui-session',
      '@deepseek-ai/dsh-client-ui-workspace',
      '@deepseek-ai/dsh-client-ui-conversation',
      '@deepseek-ai/dsh-client-ui-chat',
      '@deepseek-ai/dsh-client-ui-input-trigger',
    ])
    for (const dependency of manifest.dsh.client.inject) {
      expect(manifest.peerDependencies).toHaveProperty(dependency)
      expect(manifest.devDependencies).toHaveProperty(dependency)
    }
    for (const dependency of Object.keys(manifest.peerDependencies)) {
      expect(manifest.peerDependenciesMeta).toHaveProperty(dependency, { optional: true })
    }
    expect(manifest.exports).toHaveProperty('./client')
    expect(manifest.exports).toHaveProperty('./typert')
    expect(manifest.exports).toHaveProperty('./remote')
    expect(manifest.files).toContain('lib/client.js')
    expect(manifest.files).toContain('lib/types-*.d.ts')
    expect(manifest.files).not.toContain('lib')
    expect(manifest.dependencies).toEqual({ zod: 'catalog:' })
    expect(manifest.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/zaizaizhao/dsh-branchmark.git',
      directory: 'packages/bundle',
    })
    expect(manifest).not.toHaveProperty('bundleDependencies')
    const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
    expect(patch).toContain('name: dsh-branchmark')
    expect(patch).not.toContain('name: dsh-branchmark-host')
    expect(patch).not.toContain('name: dsh-branchmark-client')
    expect(patch).toContain("summaryProvider: ''")
  })
})
