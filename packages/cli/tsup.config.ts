import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Bundle @spm/shared into the output so the CLI is self-contained.
  // All other dependencies stay external (installed via npm).
  noExternal: ['@spm/shared'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
