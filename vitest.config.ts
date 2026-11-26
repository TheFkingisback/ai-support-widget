import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { projects: [
  'server/vitest.config.ts',
  'widget/vitest.config.ts',
  'web/vitest.config.ts',
] } });
