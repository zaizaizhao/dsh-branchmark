/** Evaluate the published browser factory without Node runtime globals. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const externals = new Map([
  ['react', require('react')],
  ['react-dom', require('react-dom')],
  ['react/jsx-runtime', require('react/jsx-runtime')],
  // Component rendering is exercised in DSH; importing its factory must not render UI.
  ['@deepseek-ai/dsh-client-ui-primitives', {}],
])

/** Load a compiled DSH module using the browser's external-module roster.
 * @param source - Compiled browser entry.
 * @returns The factory's public exports.
 */
export function verifyBrowserBundle(source) {
  let exports
  const window = {
    __ModuleLoader__: {
      load({ id, factory }) {
        assert.equal(id, 'dsh-branchmark')
        exports = factory((name) => {
          assert.ok(externals.has(name), `Undeclared browser external: ${name}`)
          return externals.get(name)
        })
      },
    },
  }
  runInNewContext(source, { window }, { timeout: 5000 })
  assert.equal(typeof exports?.apply, 'function')
  assert.ok(Array.isArray(exports.inject))
  return exports
}
