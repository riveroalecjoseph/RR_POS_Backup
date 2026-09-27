import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';

test.describe('Module D & E: Inter-Branch Handshake, Analytics & Security', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.clickQuickFill('admin');
    await loginPage.submitBtn.click();
    await expect(page.locator('#nav-inventory-btn:visible, #mobile-nav-inventory-btn:visible')).toBeVisible();
  });

  test('TC-08: Two-step inter-branch transfer handshake workflow', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.goto();

    // 1. Dispatch transfer from Central to North Mall
    await page.locator('#dispatch-transfer-btn').click();
    await page.locator('#target-branch-select').selectOption({ label: 'North Mall Hub (BR-NORTH)' });
    await page.locator('button:has-text("Dispatch Shipment")').click();

    // Verify status becomes IN_TRANSIT in Outbound tab
    await page.locator('#tab-outbound-transfers').click();
    await expect(page.locator('text=IN_TRANSIT').first()).toBeVisible();

    // 2. Switch branch to North Mall Hub as receiver
    await page.locator('#branch-select').selectOption({ label: 'North Mall Hub' });

    // 3. Open Incoming Handshakes tab
    await page.locator('#tab-incoming-transfers').click();
    const inspectBtn = page.locator('button:has-text("Inspect & Confirm Receipt")').first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // 4. Confirm receipt
    await page.locator('button:has-text("Confirm & Credit Stock")').click();

    // 5. Verify status updates to Received
    await expect(page.locator('.transfer-status-badge:has-text("Received")').first()).toBeVisible();
  });

  test('TC-09: Transfer discrepancy and transit damage logging', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.goto();

    // 1. Dispatch 10 units of Pain Au Chocolat from Central
    await page.locator('#branch-select').selectOption({ label: 'Central Flagship Branch' });
    await page.locator('#dispatch-transfer-btn').click();
    await page.locator('#target-branch-select').selectOption({ label: 'North Mall Hub (BR-NORTH)' });

    // Select product and set qty 10
    await page.locator('#transfer-product-select-0').selectOption({ index: 3 }); // Pain Au Chocolat
    await page.locator('#transfer-item-qty-0').fill('10');
    await page.locator('button:has-text("Dispatch Shipment")').click();

    // 2. Switch to North Mall Hub to inspect incoming shipment
    await page.locator('#branch-select').selectOption({ label: 'North Mall Hub' });
    await page.locator('#tab-incoming-transfers').click();

    const inspectBtn = page.locator('button:has-text("Inspect & Confirm Receipt")').first();
    await inspectBtn.click();

    // 3. Report 2 damaged units (received 8 instead of 10)
    const recvInput = page.locator('input[type="number"][max="10"]').first();
    await recvInput.fill('8');

    // Enter damage explanation
    const damageInput = page.locator('input[placeholder*="discrepancy reason"]');
    await damageInput.fill('2 pastries crushed during transit');

    // Also fill general incident notes if displayed
    const generalNotes = page.locator('input[placeholder*="Delivery box was crushed"]');
    if (await generalNotes.isVisible()) {
      await generalNotes.fill('2 pastries crushed during transit');
    }

    // Confirm receipt
    await page.locator('button:has-text("Confirm & Credit Stock")').click();

    // 4. Verify discrepancy notes and audit log
    await expect(page.locator('text=Received').first()).toBeVisible();
    await expect(page.locator('.discrepancy-notes').first()).toBeVisible();

    // Check movement audit tab records Waste/Spoilage for damaged units
    await page.locator('#tab-movement-audit').click();
    await expect(page.locator('td:has-text("Waste/Spoilage")').first()).toBeVisible();
  });

  test('TC-10: Monthly Trend Analytics Modal renders rankings and branch velocity cards', async ({ page }) => {
    // 1. Open Analysis Report
    await page.locator('#analysis-report-btn:visible, #mobile-analysis-report-btn:visible').first().click();

    // 2. Verify modal header and Top 3 podiums
    await expect(page.locator('text=Monthly Trend Analysis & Smart Insights')).toBeVisible();
    await expect(page.locator('text=Highest Volume (Units Sold)')).toBeVisible();
    await expect(page.locator('text=Highest Revenue Generated (₱)')).toBeVisible();

    // 3. Verify Branch Velocity Insights section
    await expect(page.locator('text=Inter-Branch Velocity & Movement Patterns')).toBeVisible();
    await expect(page.locator('text=Units Transferred').first()).toBeVisible();

    // 4. Verify Seasonal Demand Spotlights
    await expect(page.locator('text=Seasonal Demand Spotlights & Restock Advisories')).toBeVisible();

    // 5. Verify Export CSV button
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Print Report")')).toBeVisible();
  });

  test('TC-11: Security & search engine exclusion headers verification', async ({ request }) => {
    // 1. Query server response
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();

    // 2. Verify HTML meta tag
    const text = await response.text();
    expect(text).toContain('<meta name="robots" content="noindex, nofollow, noarchive, nosnippet"');

    // 3. Verify robots.txt route
    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.ok()).toBeTruthy();
    const robotsText = await robotsRes.text();
    expect(robotsText).toContain('Disallow: /');
  });
});
