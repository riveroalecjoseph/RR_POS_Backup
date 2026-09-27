import { Page, Locator } from '@playwright/test';

export class POSPage {
  readonly page: Page;
  readonly navPOSBtn: Locator;
  readonly searchInput: Locator;
  readonly discountTriggerBtn: Locator;
  readonly payBtn: Locator;

  // Payment modal
  readonly cashPaymentBtn: Locator;
  readonly exactAmountBtn: Locator;
  readonly completeOrderBtn: Locator;

  // Receipt modal
  readonly receiptBox: Locator;
  readonly newSaleBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navPOSBtn = page.locator('#nav-pos-btn:visible, #mobile-nav-pos-btn:visible').first();
    this.searchInput = page.locator('input[placeholder*="Search products"]');
    this.discountTriggerBtn = page.locator('button:has-text("Discount")').first();
    this.payBtn = page.locator('button:has-text("Pay ₱")');

    this.cashPaymentBtn = page.locator('button:has-text("Cash")').first();
    this.exactAmountBtn = page.locator('button:has-text("Exact")');
    this.completeOrderBtn = page.locator('button:has-text("Complete Order")');

    this.receiptBox = page.locator('#thermal-receipt-printable');
    this.newSaleBtn = page.locator('button:has-text("New Sale")');
  }

  async goto() {
    await this.navPOSBtn.click();
  }

  async addItem(productName: string) {
    const productCard = this.page.locator(`[data-product-name="${productName}"]`).first();
    await productCard.click();
  }

  async applyDiscount(presetName: string) {
    await this.discountTriggerBtn.click();
    await this.page.locator(`button:has-text("${presetName}")`).first().click();
    await this.page.locator('button:has-text("Apply Discount")').click();
  }

  async settleWithCash() {
    await this.payBtn.click();
    await this.completeOrderBtn.click();
  }
}
