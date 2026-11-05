import {defineConfig} from 'vitest/config';
// Some tests launch a real Chromium; when the whole suite runs in parallel they need more than 5s.
export default defineConfig({test:{include:['tests/**/*.test.{ts,tsx}'],testTimeout:30000}});
