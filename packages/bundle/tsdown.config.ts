import { defineConfig } from 'tsdown'

const PACKAGE_ID = 'dsh-branchmark'
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-api-session-controller/client',
  '@deepseek-ai/dsh-api-workspace-controller/client',
  '@deepseek-ai/dsh-client-ui-chat/client',
  '@deepseek-ai/dsh-client-ui-renderer/client',
  '@deepseek-ai/dsh-client-ui-session/client',
  '@deepseek-ai/dsh-client-ui-workspace/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
]

export default defineConfig([
  {
    name: PACKAGE_ID,
    entry: {
      index: 'src/index.ts',
      'typert.host': 'src/typert.ts',
      'typert.remote-client': 'src/remote.ts',
    },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: true,
    sourcemap: true,
    clean: true,
    deps: {
      neverBundle: true,
      alwaysBundle: [
        'dsh-branchmark-host',
        'dsh-branchmark-host/typert',
        'dsh-branchmark-host/remote',
        'dsh-branchmark-host/types',
        '@deepseek-ai/schemastery',
        '@deepseek-ai/cosmokit',
        '@standard-schema/spec',
      ],
    },
    outputOptions: { codeSplitting: true },
  },
  {
    name: `${PACKAGE_ID}/client`,
    entry: { client: '../client/src/client/index.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: CLIENT_EXTERNALS,
      alwaysBundle: (id: string) => !CLIENT_EXTERNALS.includes(id),
    },
    outputOptions: {
      codeSplitting: false,
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
