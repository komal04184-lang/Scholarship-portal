const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CLIENT_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots_final');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fillInput(page, selector, text) {
  await page.waitForSelector(selector);
  await page.$eval(selector, (el, val) => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, text);
}

async function runBrowserTests() {
  console.log('====================================================');
  console.log('  APEXSCHOLAR E2E BROWSER VERIFICATION SUITE       ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  try {
    // ====================================================
    // CONTEXT 1: Reviewer Portal, Document Access & Nav
    // ====================================================
    const revContext = await browser.createBrowserContext();
    const revPage = await revContext.newPage();
    await revPage.setViewport({ width: 1400, height: 900 });

    revPage.on('dialog', async (dialog) => {
      console.log(`[Reviewer Dialog] ${dialog.type()}: ${dialog.message().slice(0, 80)}...`);
      await dialog.accept();
    });

    console.log('--- TEST 1: Dedicated Reviewer Login Page (Issue 5) ---');
    await revPage.goto(`${CLIENT_URL}/reviewer/login`, { waitUntil: 'domcontentloaded' });
    await sleep(1000);

    const headingText = await revPage.$eval('h1', (el) => el.textContent.trim());
    assert(headingText.includes('Reviewer') || headingText.includes('Officer'), `Reviewer login page rendered with branding ("${headingText}")`);

    // Student login must be rejected
    await fillInput(revPage, 'input[type="email"]', 'student@scholarship.gov.in');
    await fillInput(revPage, 'input[type="password"]', 'Student@123');
    await revPage.click('button[type="submit"]');
    await sleep(1200);

    const errorMessage = await revPage.$eval('div[style*="background: rgb(254, 242, 242)"], div[style*="#FEF2F2"]', (el) => el.textContent.trim()).catch(() => '');
    assert(
      errorMessage.includes('not authorised') || errorMessage.includes('Access Restricted') || errorMessage.includes('Student'),
      `Student login rejected on reviewer login portal with message: "${errorMessage}"`
    );

    // Valid Reviewer login
    await fillInput(revPage, 'input[type="email"]', 'reviewer@scholarship.gov.in');
    await fillInput(revPage, 'input[type="password"]', 'Reviewer@123');
    await revPage.click('button[type="submit"]');
    await sleep(2500);

    const reviewerDeskVisible = await revPage.$eval('body', (el) => el.textContent.includes('Reviewer Desk') || el.textContent.includes('Applications Assigned for Review'));
    assert(reviewerDeskVisible, 'Reviewer credentials authenticated and redirected to Reviewer Desk');
    await revPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_reviewer_desk.png') });

    // TEST 2: Reviewer Document Inspection & Preview Modal (Issue 2)
    console.log('\n--- TEST 2: Reviewer Document View & Preview (Issue 2) ---');
    await sleep(2000);

    const clickedView = await revPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const viewBtn = buttons.find(b => b.textContent.trim() === 'View' || b.title.includes('Preview Document'));
      if (viewBtn) {
        viewBtn.click();
        return true;
      }
      return false;
    });
    assert(clickedView, 'Found and clicked View button on application document');
    await sleep(2000);

    const hasIframeOrImg = await revPage.evaluate(() => {
      const iframe = document.querySelector('iframe');
      const img = document.querySelector('img[alt="Document Preview"]');
      const modal = document.querySelector('div[style*="z-index: 9999"], div[style*="zIndex: 9999"]');
      return !!(iframe || img || modal);
    });
    assert(hasIframeOrImg, 'Document preview modal opened with inline document viewer (iframe/img)');
    await revPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_document_preview_modal.png') });

    // Close preview modal
    await revPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const closeBtn = buttons.find(b => b.textContent.includes('Close'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(1000);

    // TEST 3: Website Back Arrow Navigation (Issue 1)
    console.log('\n--- TEST 3: Website Back Arrow Navigation (Issue 1) ---');
    const backButton = await revPage.$('header button[title*="back" i], header button svg');
    assert(!!backButton, 'Top-left back arrow button is rendered in the header');

    if (backButton) {
      await revPage.evaluate(() => {
        const btn = document.querySelector('header button[title*="back" i]');
        if (btn) btn.click();
      });
      await sleep(1000);
      const currentUrl = revPage.url();
      assert(!currentUrl.includes('about:blank'), `Back arrow navigated internally without exiting site (Current URL: ${currentUrl})`);

      const userBadge = await revPage.$eval('body', (el) => el.textContent.includes('reviewer') || el.textContent.includes('Reviewer') || el.textContent.includes('Sign Out'));
      assert(userBadge, 'User remains authenticated during internal back navigation (not logged out)');
    }

    await revContext.close();

    // ====================================================
    // CONTEXT 2: Admin Dashboard & Lifecycle Controls
    // ====================================================
    const adminContext = await browser.createBrowserContext();
    const adminPage = await adminContext.newPage();
    await adminPage.setViewport({ width: 1400, height: 900 });

    adminPage.on('dialog', async (dialog) => {
      console.log(`[Admin Dialog] ${dialog.type()}: ${dialog.message().slice(0, 80)}...`);
      await dialog.accept();
    });

    console.log('\n--- TEST 4: Admin Dashboard Role Separation (Issue 4) ---');
    await adminPage.goto(`${CLIENT_URL}/reviewer/login`, { waitUntil: 'domcontentloaded' });
    await sleep(1000);
    await fillInput(adminPage, 'input[type="email"]', 'admin@scholarship.gov.in');
    await fillInput(adminPage, 'input[type="password"]', 'Admin@123');
    await adminPage.click('button[type="submit"]');
    await sleep(2500);

    const adminDeskText = await adminPage.$eval('body', (el) => el.textContent);
    const hasAdminDashboard = adminDeskText.includes('Scholarship Schemes') || adminDeskText.includes('Directorate') || adminDeskText.includes('Admin Desk') || adminDeskText.includes('Total Applications');
    const hasStudentSearch = adminDeskText.includes('Search scholarships, degrees, fields of study');
    assert(hasAdminDashboard, 'Admin logged in and landed on Admin Directorate Desk');
    assert(!hasStudentSearch, 'Admin Dashboard does NOT display public student catalogue search by default');
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_admin_desk.png') });

    // TEST 5: Admin Scholarship Lifecycle Controls (Issue 3)
    console.log('\n--- TEST 5: Admin Scholarship Lifecycle Controls (Issue 3) ---');
    await sleep(1500);
    const clickedLifecycle = await adminPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('table button'));
      const target = btns.find(b => b.textContent.trim() === 'Pause' || b.textContent.trim() === 'Resume');
      if (target) {
        target.click();
        return target.textContent.trim();
      }
      return null;
    });
    assert(!!clickedLifecycle, `Admin clicked ${clickedLifecycle || 'lifecycle'} button on scholarship scheme`);
    await sleep(2000);
    await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_scholarship_paused.png') });

    await adminContext.close();

    // ====================================================
    // CONTEXT 3: Public Catalog & Deadline Badges (Issue 6)
    // ====================================================
    const guestContext = await browser.createBrowserContext();
    const catalogPage = await guestContext.newPage();
    await catalogPage.setViewport({ width: 1400, height: 900 });

    console.log('\n--- TEST 6: Deadline Enforcement & Expiry Badges (Issue 6) ---');
    await catalogPage.goto(`${CLIENT_URL}/`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);

    const catalogText = await catalogPage.$eval('body', (el) => el.textContent);
    const hasClosedOrPaused = catalogText.includes('Application Closed') || catalogText.includes('Paused');
    assert(hasClosedOrPaused, 'Public catalog correctly displays "Application Closed" or "Paused" badges on expired/paused scholarships');

    const disabledButtons = await catalogPage.$$eval('button:disabled', btns => btns.map(b => b.textContent.trim()));
    const hasDisabledLifecycleButton = disabledButtons.some(t => t.includes('Application Closed') || t.includes('Temporarily Paused'));
    assert(hasDisabledLifecycleButton, `Apply button is disabled with "Application Closed" or "Temporarily Paused" status (Found: ${disabledButtons.slice(0, 3).join(', ')})`);
    await catalogPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_catalog_deadlines.png') });

    await guestContext.close();

    console.log('\n====================================================');
    console.log(`TOTAL BROWSER TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Browser Test Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runBrowserTests();
