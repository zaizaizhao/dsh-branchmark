import { defineConfig } from 'tsdown'
import { typertPlugin } from '@deepseek-ai/dsh-typert-generator/tsdown'

export default defineConfig({
  name: 'dsh-branchmark-host',
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
  },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: true,
  sourcemap: true,
  clean: true,
  plugins: [typertPlugin({ mode: 'package', faces: ['host'] })],
})
