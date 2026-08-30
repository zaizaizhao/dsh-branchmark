/** PROTOTYPE — one-command static server for the BranchMark interaction study. */

import { createReadStream } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const port = 4178

createServer((request, response) => {
  const path = request.url?.split('?')[0] === '/prototype.js' ? 'prototype.js' : 'index.html'
  response.writeHead(200, {
    'Content-Type': path.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  createReadStream(join(root, path)).pipe(response)
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`BranchMark interaction prototype: http://127.0.0.1:${String(port)}/?variant=A\n`)
})
