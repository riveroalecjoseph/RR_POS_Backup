import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { POSPage } from '../pages/POSPage';

test.describe('Module C: Point of Sale (POS) & Offline Sync', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.clickQuickFill('cashier');
    await loginPage.submitBtn.click();
    await expect(page.locator('text=Current Order')).toBeVisible();
  });

  test('TC-06: Complete POS checkout with discount, cash tender, and thermal receipt', async ({ page }) => {
    const posPage = new POSPage(page);

    // 1. Add item to cart
    await posPage.addItem('Butter Croissant Premium');
    await expect(page.locator('h4:has-text("Butter Croissant Premium")')).toBeVisible();

    // 2. Apply 10% discount
    await posPage.applyDiscount('10% Regular');
    await expect(page.locator('text=Discount Applied:').or(page.locator('text=Discount (10%)'))).toBeVisible();

    // 3. Settle with cash
    await posPage.settleWithCash();

    // 4. Verify thermal printable receipt
    await expect(posPage.receiptBox).toBeVisible();
    await expect(posPage.receiptBox).toContainText('OFFICIAL SALES RECEIPT');
    await expect(posPage.receiptBox).toContainText('Butter Croissant Premium');
    await expect(posPage.receiptBox).toContainText('GRAND TOTAL:');

    // 5. Close receipt and verify cart is cleared
    await posPage.newSaleBtn.click();
    await expect(page.locator('text=Cart is empty')).toBeVisible();
  });

  test('TC-07: Offline POS simulation, IndexedDB queueing, and reconnection sync', async ({ page }) => {
    const posPage = new POSPage(page);

    // 1. Simulate Offline Mode via top bar toggle
    await page.locator('button:has-text("Simulate Offline")').click();
    await expect(page.locator('text=Offline First Active')).toBeVisible();

    // 2. Process First Offline Transaction
    await posPage.addItem('Truffle Sea Salt Kettle Chips');
    await posPage.settleWithCash();
    await expect(posPage.receiptBox).toContainText('[STORED OFFLINE - SYNC PENDING]');
    await posPage.newSaleBtn.click();

    // 3. Process Second Offline Transaction
    await posPage.addItem('Cold Brew Reserve 500ml');
    await posPage.settleWithCash();
    await expect(posPage.receiptBox).toContainText('[STORED OFFLINE - SYNC PENDING]');
    await posPage.newSaleBtn.click();

    // 4. Verify Pending Queue in banner
    await expect(page.locator('text=pending order')).toBeVisible();

    // 5. Restore connection
    await page.locator('button:has-text("Go Back Online")').click();
    await expect(page.locator('text=Online Mode')).toBeVisible();

    // 6. Trigger Sync Now
    const syncBtn = page.locator('button:has-text("Sync Now")');
    await expect(syncBtn).toBeEnabled();
    await syncBtn.click();

    // 7. Verify queue drains and shows fully synced
    await expect(page.locator('text=Local DB fully synced')).toBeVisible();
  });

  test('TC-08: Cash Tender quick add, deduct, undo handling, and admin audit log items sold verification', async ({ page }) => {
    const posPage = new POSPage(page);

    // 1. Add items to cart
    await posPage.addItem('Butter Croissant Premium');
    await posPage.addItem('Cold Brew Reserve 500ml');

    // 2. Open payment modal
    await posPage.payBtn.click();
    await expect(page.locator('text=Checkout & Settlement')).toBeVisible();

    // Verify quick add & quick deduct sections exist
    await expect(page.locator('text=+ Quick Add Cash:')).toBeVisible();
    await expect(page.locator('text=− Quick Deduct Cash:')).toBeVisible();

    const tenderInput = page.locator('input[placeholder="0.00"]');
    const initialTender = parseFloat(await tenderInput.inputValue());

    // Scenario: Cashier accidentally clicks +₱1000 twice
    await page.locator('button:has-text("+₱1000")').click();
    const afterFirstAdd = parseFloat(await tenderInput.inputValue());
    expect(afterFirstAdd).toBe(initialTender + 1000);

    await page.locator('button:has-text("+₱1000")').click();
    const afterSecondAdd = parseFloat(await tenderInput.inputValue());
    expect(afterSecondAdd).toBe(initialTender + 2000);

    // Cashier realizes accidental double click and clicks −₱1000 to deduct it back
    await page.locator('button:has-text("−₱1000")').click();
    const afterDeduct = parseFloat(await tenderInput.inputValue());
    expect(afterDeduct).toBe(initialTender + 1000);

    // Test Undo button: clicks Undo to revert back to previous state
    await page.locator('button:has-text("Undo")').click();
    const afterUndo = parseFloat(await tenderInput.inputValue());
    expect(afterUndo).toBe(initialTender + 2000);

    // Test Clear (₱0)
    await page.locator('button:has-text("Clear (₱0)")').click();
    expect(parseFloat(await tenderInput.inputValue())).toBe(0);
    // When tendered is 0, complete order button should be disabled
    await expect(posPage.completeOrderBtn).toBeDisabled();

    // Test Exact (reset to exact grand total)
    await page.locator('button:has-text("Exact")').click();
    expect(parseFloat(await tenderInput.inputValue())).toBe(initialTender);
    await expect(posPage.completeOrderBtn).toBeEnabled();

    // Add +₱200 so there is change due
    await page.locator('button:has-text("+₱200")').click();
    await expect(page.locator('text=Change Due:')).toBeVisible();

    // 3. Complete checkout
    await posPage.completeOrderBtn.click();

    // 4. Verify receipt modal displays the purchased items
    await expect(posPage.receiptBox).toBeVisible();
    await expect(posPage.receiptBox).toContainText('Butter Croissant Premium');
    await expect(posPage.receiptBox).toContainText('Cold Brew Reserve 500ml');
    await posPage.newSaleBtn.click();

    // 5. Sign out cashier
    await page.locator('#signout-btn').click();
    await expect(page.locator('text=Staff Portal Sign In')).toBeVisible();

    // 6. Sign in as Admin to inspect Audit Logs
    const loginPage = new LoginPage(page);
    await loginPage.clickQuickFill('admin');
    await loginPage.submitBtn.click();

    // Navigate to Admin tab
    await page.locator('#nav-admin-btn:visible, #mobile-nav-admin-btn:visible').first().click();
    await expect(page.locator('#tab-branch-audit')).toBeVisible();

    // 7. Verify the new POS_SALE audit entry contains Items Sold
    const activityStream = page.locator('#audit-trail-table, .space-y-3').first();
    await expect(activityStream).toContainText('Butter Croissant Premium');
    await expect(activityStream).toContainText('Cold Brew Reserve 500ml');
    await expect(activityStream).toContainText('Items Sold:');
  });
});

