import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Bundle @spm/shared into the output so the CLI is self-contained.
  // All other dependencies stay external (installed via npm).
  noExternal: ['@spm/shared'],
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
});
