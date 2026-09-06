/** Negative controls for the browser factory's import environment. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyBrowserBundle } from './verify-browser-bundle.mjs'

const entry = (body) =>
  `window.__ModuleLoader__.load({ id: 'dsh-branchmark', factory(require) { ${body}; return { inject: [], apply() {} } } })`

test('accepts a browser factory using the host React instance', () => {
  assert.equal(typeof verifyBrowserBundle(entry("require('react').createContext(null)")).apply, 'function')
})

test('rejects Node environment checks and unregistered browser externals', () => {
  assert.throws(() => verifyBrowserBundle(entry('process.env.NODE_ENV')), /process is not defined/u)
  assert.throws(() => verifyBrowserBundle(entry("require('node:fs')")), /Undeclared browser external/u)
})
