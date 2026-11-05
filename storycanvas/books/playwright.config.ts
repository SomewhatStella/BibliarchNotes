import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',use:{baseURL:'http://localhost:3210',viewport:{width:1440,height:1000}},webServer:{command:'npm run dev',url:'http://localhost:3210',reuseExistingServer:!!process.env.PLAYWRIGHT_REUSE_SERVER,timeout:120000}});
