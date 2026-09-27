import { Page, Locator } from "@playwright/test";

export interface NewProductData {
  sku: string;
  name: string;
  category?: string;
  costPrice: string;
  sellingPrice: string;
  initialStock?: string;
  threshold?: string;
  description?: string;
}

export class InventoryPage {
  readonly page: Page;
  readonly navInventoryBtn: Locator;
  readonly addProductBtn: Locator;
  readonly stockSearchInput: Locator;
  readonly stockTable: Locator;

  // Add product form
  readonly skuInput: Locator;
  readonly nameInput: Locator;
  readonly categorySelect: Locator;
  readonly costInput: Locator;
  readonly priceInput: Locator;
  readonly initialStockInput: Locator;
  readonly thresholdInput: Locator;
  readonly submitCreateProductBtn: Locator;

  // Edit product form
  readonly editNameInput: Locator;
  readonly editPriceInput: Locator;
  readonly editCostInput: Locator;
  readonly submitEditProductBtn: Locator;

  // Handshake transfers
  readonly incomingTab: Locator;
  readonly outboundTab: Locator;
  readonly auditTab: Locator;
  readonly dispatchTransferBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navInventoryBtn = page.locator("#nav-inventory-btn:visible, #mobile-nav-inventory-btn:visible").first();
    this.addProductBtn = page.locator("#add-product-btn");
    this.stockSearchInput = page.locator("#stock-search-input");
    this.stockTable = page.locator("#inventory-stock-table");

    this.skuInput = page.locator("#product-sku-input");
    this.nameInput = page.locator("#product-name-input");
    this.categorySelect = page.locator("#product-category-select");
    this.costInput = page.locator("#product-cost-input");
    this.priceInput = page.locator("#product-price-input");
    this.initialStockInput = page.locator("#product-initial-stock-input");
    this.thresholdInput = page.locator("#product-threshold-input");
    this.submitCreateProductBtn = page.locator("#submit-create-product-btn");

    this.editNameInput = page.locator("#edit-product-name-input");
    this.editPriceInput = page.locator("#edit-product-price-input");
    this.editCostInput = page.locator("#edit-product-cost-input");
    this.submitEditProductBtn = page.locator("#submit-edit-product-btn");

    this.incomingTab = page.locator("#tab-incoming-transfers");
    this.outboundTab = page.locator("#tab-outbound-transfers");
    this.auditTab = page.locator("#tab-movement-audit");
    this.dispatchTransferBtn = page.locator("#dispatch-transfer-btn");
  }

  async goto() {
    await this.navInventoryBtn.click();
  }

  async createProduct(data: NewProductData) {
    await this.addProductBtn.click();
    await this.skuInput.fill(data.sku);
    await this.nameInput.fill(data.name);
    if (await this.costInput.isVisible().catch(() => false)) {
      await this.costInput.fill(data.costPrice);
    }
    await this.priceInput.fill(data.sellingPrice);
    if (data.initialStock) await this.initialStockInput.fill(data.initialStock);
    if (data.threshold) await this.thresholdInput.fill(data.threshold);
    await this.submitCreateProductBtn.click();
  }

  async openEditProduct(sku: string) {
    const editBtn = this.page.locator(`.edit-product-${sku}:visible`).first();
    await editBtn.click();
  }

  async editProduct(
    sku: string,
    updates: { name?: string; price?: string; cost?: string },
  ) {
    await this.openEditProduct(sku);
    if (updates.name) await this.editNameInput.fill(updates.name);
    if (updates.price) await this.editPriceInput.fill(updates.price);
    if (updates.cost) await this.editCostInput.fill(updates.cost);
    await this.submitEditProductBtn.click();
  }

  getProductRow(sku: string): Locator {
    return this.page.locator(`[data-sku="${sku}"]:visible`).first();
  }
}
