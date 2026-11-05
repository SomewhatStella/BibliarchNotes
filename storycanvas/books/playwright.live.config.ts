import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',use:{baseURL:'http://localhost:3210',viewport:{width:1440,height:900}},workers:1,timeout:60000});
