import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:['save-delete-report.spec.ts','library-storage.spec.ts'],outputDir:'test-results-save-delete',workers:1,use:{baseURL:process.env.BOOKS_TEST_URL||'http://127.0.0.1:3224',viewport:{width:1440,height:1000}}});
