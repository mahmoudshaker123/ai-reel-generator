import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./scripts',testMatch:'studio.spec.ts',timeout:60000,workers:1,use:{baseURL:'http://localhost:3000',browserName:'chromium',channel:'msedge',headless:true,viewport:{width:1440,height:1000}},reporter:'list',outputDir:'.artifacts/playwright'});
