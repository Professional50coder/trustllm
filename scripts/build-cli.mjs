import { build } from 'esbuild'

await build({
  entryPoints: ['cli/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: 'dist/cli.cjs',
  banner: { js: '#!/usr/bin/env node' },
})
