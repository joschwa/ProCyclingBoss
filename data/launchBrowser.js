// const puppeteer = require('puppeteer');
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());
// const { KnownDevices } = require('puppeteer');


async function launchBrowser(blind, htmlSite, restrictSize=true){
    // const iPhone = KnownDevices['iPhone 13 Pro']; // Or iPhone 12, 11, etc.

    // Define the potential paths
    const paths = ['/usr/bin/chromium-browser', '/usr/bin/chromium'];

    // Find the first path that actually exists on the current system
    const executablePathFound = paths.find(path => fs.existsSync(path));

    if (!executablePathFound) {
      throw new Error("Chromium was not found at /usr/bin/chromium-browser or /usr/bin/chromium. Please install it.");
    }

    const browser = await puppeteer.launch({
    headless: blind, // Set to true if you don't want to see the browser
    executablePath: executablePathFound,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });

    const page = await browser.newPage();
    // await page.emulate(iPhone);


    // Set user agent to a mobile device
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1');

    // Set viewport to mimic a mobile device screen
    if(restrictSize){
        await page.setViewport({
            width: 375,
            height: 812,
            isMobile: true,
            hasTouch: true,
            isLandscape: false,
            });
    }
    
    // intercept requests to load target images
    await page.setRequestInterception(true);

    page.on('request', interceptRequest => {
    if (interceptRequest.isInterceptResolutionHandled()) return;
    if (
        interceptRequest.url().includes('.gif?') ||
        interceptRequest.url().includes('.jpg?') ||
        interceptRequest.url().includes('.png?') 
    )
        interceptRequest.abort();
    else interceptRequest.continue();
    });
    
    page.setDefaultTimeout(180000);
    page.setDefaultNavigationTimeout(180000);
    // Navigate to a webpage
    console.log('initial_html', htmlSite);
    await page.goto(htmlSite, {
    waitUntil: "domcontentloaded",
    timeout: 200000
    });
    // const filehtml = "file:///home/jrl/projects/scrppcs/ProCyclingStats Best Rider Ranking.html"
    // await page.goto(filehtml);

    console.log('Initial page loaded..');

    return(page)
};
  
module.exports = launchBrowser;
  
