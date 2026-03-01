const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  try {
    const browser = await chromium.launch({
      headless: false,
      slowMo: 1000
    });
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    await page.goto('http://localhost:51002');
    console.log('Page loaded');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-screenshot.png' });
    console.log('Screenshot saved');
    
    // Close browser
    await browser.close();
    console.log('Browser closed');
  } catch (error) {
    console.error('Error:', error);
  }
})();
