import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',outputDir:'test-results-selection',workers:1,use:{baseURL:process.env.BOOKS_TEST_URL||'http://localhost:3227',viewport:{width:1440,height:1000}}});
