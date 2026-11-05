import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'../../e2e',testMatch:'pagination.spec.ts',timeout:60000,use:{baseURL:'http://localhost:3210',viewport:{width:1440,height:1000}}});
