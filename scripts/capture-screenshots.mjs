/**
 * Captures the README screenshots against a running production server.
 * Usage: BASE_URL=http://localhost:3000 node scripts/capture-screenshots.mjs
 * Signs in with the demo credentials (alex@demo.com / demo1234).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = new URL("../docs/screenshots/", import.meta.url).pathname;

const EMAIL = process.env.DEMO_EMAIL ?? "alex@demo.com";
const PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234";

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

async function newContext() {
  return browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
}

async function shot(page, name, headingText) {
  if (headingText) {
    await page
      .getByRole("heading", { name: headingText })
      .first()
      .waitFor({ timeout: 15000 });
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(700); // let charts/animations settle
  await page.screenshot({ path: `${OUT_DIR}${name}.png` });
  console.log(`✓ ${name}.png`);
}

async function signIn(page, { shootLogin = false } = {}) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  if (shootLogin) await shot(page, "login", "Welcome to SplitStack");
  await page.fill("#demo-email", EMAIL);
  await page.fill("#demo-password", PASSWORD);
  // language-agnostic: the demo form is the first form on the page
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL("**/home", { timeout: 15000 });
}

// --- Main flow (light mode, English) ---
{
  const context = await newContext();
  const page = await context.newPage();
  await signIn(page, { shootLogin: true });

  await shot(page, "home", "Your groups");

  await page.getByRole("link", { name: /Trip to Dubai/ }).first().click();
  await page.waitForURL("**/groups/*");
  await shot(page, "group", "Your balances");

  await page
    .getByRole("link", { name: "Add expense", exact: true })
    .first()
    .click();
  await page.waitForURL("**/expenses/new");
  await shot(page, "add-expense", "Add expense");

  await page.goBack();
  await page.getByRole("link", { name: /Settle up/ }).first().click();
  await page.waitForURL("**/settle");
  await shot(page, "settle", "Suggested payments");

  await page.goto(`${BASE_URL}/dashboard`);
  await shot(page, "dashboard", "Spending by category");

  // Dark mode (home)
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto(`${BASE_URL}/home`);
  await shot(page, "dark", "Your groups");

  await context.close();
}

// --- Arabic RTL (fresh context, light mode) ---
{
  const context = await newContext();
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "ar", url: BASE_URL },
  ]);
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE_URL}/home`);
  await page.getByRole("link", { name: /Trip to Dubai/ }).first().click();
  await page.waitForURL("**/groups/*");
  await shot(page, "arabic", "أرصدتك");
  await context.close();
}

await browser.close();
console.log("Done — screenshots in docs/screenshots/");
