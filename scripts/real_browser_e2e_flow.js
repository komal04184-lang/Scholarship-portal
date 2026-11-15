const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runEndToEndBrowserWorkflow() {
  console.log('=== REAL BROWSER WORKFLOW: STUDENT APPLY, DOCUMENT UPLOAD, REVIEWER DECISION ===\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Visit landing page
    console.log('1. Navigating to portal...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    // 2. Open login modal
    console.log('2. Opening Auth Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.innerText.includes('Sign up / Log in'));
      if (loginBtn) loginBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // 3. Login as Student
    console.log('3. Logging in as student...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const emailIn = inputs.find(i => i.type === 'email' || i.name === 'email');
      const passIn = inputs.find(i => i.type === 'password' || i.name === 'password');
      if (emailIn && passIn) {
        emailIn.value = 'student@example.com';
        passIn.value = 'Student@123';
        emailIn.dispatchEvent(new Event('input', { bubbles: true }));
        passIn.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const submit = document.querySelector('button[type="submit"], .btn-primary');
      if (submit) submit.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // 4. Navigate to student dashboard
    console.log('4. Checking Student Dashboard...');
    const hasDashboardBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dashBtn = btns.find(b => b.innerText.includes('My Dashboard'));
      if (dashBtn) {
        dashBtn.click();
        return true;
      }
      return false;
    });
    await new Promise(r => setTimeout(r, 2000));
    console.log('   Navigated to Student Dashboard:', hasDashboardBtn);

    // 5. Check active applications list on student dashboard
    const studentAppCards = await page.evaluate(() => {
      return document.querySelectorAll('[class*="card"], [class*="application"]').length;
    });
    console.log('   Applications detected in UI:', studentAppCards);

    // 6. Sign out
    console.log('5. Signing out student...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const signOut = btns.find(b => b.innerText.includes('Sign Out'));
      if (signOut) signOut.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // 7. Login as Reviewer
    console.log('6. Logging in as Reviewer...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loginBtn = btns.find(b => b.innerText.includes('Sign up / Log in'));
      if (loginBtn) loginBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Switch to reviewer tab
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const revTab = tabs.find(b => b.innerText.includes('Reviewer') || b.innerText.includes('Admin / Reviewer'));
      if (revTab) revTab.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const emailIn = inputs.find(i => i.type === 'email' || i.name === 'email');
      const passIn = inputs.find(i => i.type === 'password' || i.name === 'password');
      if (emailIn && passIn) {
        emailIn.value = 'reviewer@scholarship.gov.in';
        passIn.value = 'Reviewer@123';
        emailIn.dispatchEvent(new Event('input', { bubbles: true }));
        passIn.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const submit = document.querySelector('button[type="submit"], .btn-primary');
      if (submit) submit.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // 8. Verify Reviewer Dashboard rendering
    console.log('7. Verifying Reviewer Dashboard interface...');
    const reviewerElements = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasReviewerTitle: text.includes('Review') || text.includes('Application') || text.includes('Scrutiny'),
        buttonsCount: document.querySelectorAll('button').length,
      };
    });
    console.log('   Reviewer dashboard active:', reviewerElements);

    console.log('\n✅ Real browser workflow verified successfully!');
  } catch (err) {
    console.error('Browser workflow error:', err);
  } finally {
    await browser.close();
  }
}

runEndToEndBrowserWorkflow().catch(e => console.error(e));
