import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'public', 'report_images');
const baseUrl = (process.env.REPORT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const storageStatePath = process.env.REPORT_STORAGE_STATE;
const headless = process.env.REPORT_HEADLESS === 'true';

await mkdir(outputDirectory, { recursive: true });

let storageState;
if (storageStatePath) {
  try {
    await access(storageStatePath);
    storageState = storageStatePath;
  } catch {
    throw new Error(`REPORT_STORAGE_STATE does not exist: ${storageStatePath}`);
  }
}

const browser = await chromium.launch({ headless });
const context = await browser.newContext({
  ...(storageState ? { storageState } : {}),
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1
});
const page = await context.newPage();
const results = [];

async function capture(name, route, expectedPath) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const finalUrl = page.url();
  const authenticatedView = new URL(finalUrl).pathname.startsWith(expectedPath);
  const fileName = `${name}${authenticatedView ? '' : '-auth-required'}.png`;
  const filePath = path.join(outputDirectory, fileName);
  const emailLocator = page.locator('text=/[^\\s@]+@[^\\s@]+/');

  await page.screenshot({
    path: filePath,
    fullPage: true,
    animations: 'disabled',
    mask: await emailLocator.count() ? [emailLocator] : []
  });

  results.push({
    page: route,
    screenshot: `public/report_images/${fileName}`,
    httpStatus: response?.status() ?? null,
    finalUrl,
    capturedRequestedPage: authenticatedView
  });
}

try {
  await page.goto(`${baseUrl}/portal`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  if (!storageState && !headless) {
    const terminal = createInterface({ input: stdin, output: stdout });
    stdout.write('\nPortal đã mở trong Chromium. Đăng nhập Google thủ công nếu cần, chờ portal hoàn tất rồi nhấn Enter tại terminal để tiếp tục chụp.\n');
    await terminal.question('Nhấn Enter để tiếp tục... ');
    terminal.close();
  }

  await capture('guest-portal', '/portal', '/portal');
  await capture('admin-dashboard', '/admin/dashboard', '/admin/dashboard');
  await capture('smtp-marketing-form', '/admin/send-email', '/admin/send-email');

  const manifestPath = path.join(outputDirectory, 'capture-manifest.json');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(manifestPath, `${JSON.stringify({ baseUrl, capturedAt: new Date().toISOString(), results }, null, 2)}\n`);
  stdout.write(`\nĐã lưu manifest: ${manifestPath}\n`);
  for (const result of results) {
    stdout.write(`${result.screenshot} | status=${result.httpStatus ?? 'unknown'} | requested page captured=${result.capturedRequestedPage}\n`);
  }
} finally {
  await context.close();
  await browser.close();
}
