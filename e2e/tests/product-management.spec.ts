import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { InventoryPage } from "../pages/InventoryPage";
import { POSPage } from "../pages/POSPage";
import { SAMPLE_PRODUCT } from "../fixtures/testData";

test.describe("Module B: Product Catalog Management (Add & Edit Products)", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    // Login as Admin so the test can manage inventory AND verify POS cross-view propagation
    await loginPage.clickQuickFill("admin");
    await loginPage.submitBtn.click();
    await page.locator("#nav-inventory-btn:visible, #mobile-nav-inventory-btn:visible").first().click();
    await expect(
      page.locator("text=Multi-Branch Inventory & Transfers"),
    ).toBeVisible();
  });

  test("TC-04: Add new product and verify instant propagation to Inventory and POS views", async ({
    page,
  }) => {
    const inventoryPage = new InventoryPage(page);
    const posPage = new POSPage(page);

    // 1. Open Add Product modal and create new product
    await inventoryPage.createProduct({
      sku: SAMPLE_PRODUCT.sku,
      name: SAMPLE_PRODUCT.name,
      costPrice: SAMPLE_PRODUCT.costPrice,
      sellingPrice: SAMPLE_PRODUCT.sellingPrice,
      initialStock: SAMPLE_PRODUCT.initialStock,
      threshold: SAMPLE_PRODUCT.lowThreshold,
    });

    // 2. Verify new product is listed in the Inventory stock table
    const productRow = inventoryPage.getProductRow(SAMPLE_PRODUCT.sku);
    await expect(productRow).toBeVisible();
    await expect(productRow.locator(".product-name-cell")).toContainText(
      SAMPLE_PRODUCT.name,
    );
    await expect(productRow.locator(".product-price-cell")).toContainText(
      `₱${SAMPLE_PRODUCT.sellingPrice}`,
    );
    await expect(productRow.locator(".stock-quantity-cell")).toContainText(
      SAMPLE_PRODUCT.initialStock,
    );

    // 3. Switch to POS Screen
    await posPage.goto();

    // Verify new product appears in POS grid with accurate price
    const posCard = page.locator(`[data-product-name="${SAMPLE_PRODUCT.name}"]`);
    await expect(posCard).toBeVisible();
    await expect(posCard.locator("text=₱145.00")).toBeVisible();
  });

  test("TC-05: Edit product details and verify cross-view propagation", async ({
    page,
  }) => {
    const inventoryPage = new InventoryPage(page);
    const posPage = new POSPage(page);

    // 1. Edit existing product Cold Brew Reserve (SKU: BEV-001)
    await inventoryPage.goto();
    const updatedName = "Cold Brew Nitro Reserve 500ml";
    const updatedPrice = "199";

    await inventoryPage.editProduct("BEV-001", {
      name: updatedName,
      price: updatedPrice,
    });

    // 2. Verify updated name and price in inventory table
    const row = inventoryPage.getProductRow("BEV-001");
    await expect(row.locator(".product-name-cell")).toHaveText(updatedName);
    await expect(row.locator(".product-price-cell")).toContainText("₱199.00");

    // 3. Switch to POS screen and verify updated name & price
    await posPage.goto();
    const updatedPosCard = page.locator(`[data-product-name="${updatedName}"]`);
    await expect(updatedPosCard).toBeVisible();
    await expect(updatedPosCard.locator("text=₱199.00")).toBeVisible();
  });
});
