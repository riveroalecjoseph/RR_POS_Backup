import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { DEMO_USERS } from "../fixtures/testData";

test.describe("Module A: Authentication, Login Flow & Demo Quick-Fill", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("TC-01: Unauthenticated users are routed to login screen", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Verify login portal is visible
    await expect(page.locator("text=Staff Portal Sign In")).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();

    // Verify POS register grid is NOT accessible without auth
    await expect(page.locator("#nav-pos-btn")).not.toBeVisible();
    await expect(page.locator("#thermal-receipt-printable")).not.toBeVisible();
  });

  test("TC-02: Demo credentials quick-fill buttons auto-populate and route appropriately", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // 1. Test Cashier Quick-Fill
    await loginPage.clickQuickFill("cashier");
    await expect(loginPage.emailInput).toHaveValue(DEMO_USERS.cashier.email);
    await expect(loginPage.passwordInput).toHaveValue(
      DEMO_USERS.cashier.password,
    );

    await loginPage.submitBtn.click();

    // Verify redirected to POS register and cashier navigation
    await expect(page.locator("#nav-pos-btn:visible, #mobile-nav-pos-btn:visible")).toBeVisible();
    await expect(page.locator("text=Current Order")).toBeVisible();
    // Cashier cannot access Staff & RBAC management
    await expect(page.locator("#nav-admin-btn:visible, #mobile-nav-admin-btn:visible")).not.toBeVisible();

    // Sign out to test next role
    await page.locator("#signout-btn").click();
    await expect(page.locator("text=Staff Portal Sign In")).toBeVisible();

    // 2. Test Inventory Manager Quick-Fill
    await loginPage.clickQuickFill("manager");
    await expect(loginPage.emailInput).toHaveValue(DEMO_USERS.manager.email);
    await loginPage.submitBtn.click();

    // Manager starts on Inventory & Transfers view
    await expect(
      page.locator("text=Multi-Branch Inventory & Transfers"),
    ).toBeVisible();
    await expect(page.locator("#add-product-btn")).toBeVisible();
    await expect(page.locator("#dispatch-transfer-btn")).toBeVisible();

    // Sign out to test Super Admin
    await page.locator("#signout-btn").click();

    // 3. Test Super Admin Quick-Fill
    await loginPage.clickQuickFill("admin");
    await expect(loginPage.emailInput).toHaveValue(DEMO_USERS.admin.email);
    await loginPage.submitBtn.click();

    // Super Admin has full tabs access including Staff & RBAC
    await expect(page.locator("#nav-pos-btn:visible, #mobile-nav-pos-btn:visible")).toBeVisible();
    await expect(page.locator("#nav-inventory-btn:visible, #mobile-nav-inventory-btn:visible")).toBeVisible();
    await expect(page.locator("#nav-admin-btn:visible, #mobile-nav-admin-btn:visible")).toBeVisible();
  });

  test("TC-03: Manual login with invited credentials triggers password change flow", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Login with invited staff email
    await loginPage.login(
      DEMO_USERS.invited.email,
      DEMO_USERS.invited.password,
    );

    // Verify Set / Change Password modal appears
    await expect(page.locator("text=Set / Change Password")).toBeVisible();
    await expect(loginPage.newPasswordInput).toBeVisible();

    // Change password
    await loginPage.changePassword("SecurePass@2026");

    // Verify success toast and arrival to workstation
    await expect(
      page.locator("text=Multi-Branch Inventory & Transfers"),
    ).toBeVisible();
  });

  test("TC-01b: System always starts at login page and does not restore previous session on reload for security", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // 1. Sign in as Cashier
    await loginPage.clickQuickFill("cashier");
    await loginPage.submitBtn.click();

    // Verify cashier workstation is active
    await expect(page.locator("text=Current Order")).toBeVisible();

    // 2. Reload the page without clearing storage manually
    await page.reload();

    // 3. Expected: System starts at login page; previous session is NOT restored
    await expect(page.locator("text=Staff Portal Sign In")).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(page.locator("#nav-pos-btn")).not.toBeVisible();
    await expect(page.locator("text=Current Order")).not.toBeVisible();
  });

  test("TC-01c: Inventory Manager role strictly restricted to Inventory & Transfers without POS or Admin access", async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // 1. Sign in as Inventory Manager
    await loginPage.clickQuickFill("manager");
    await loginPage.submitBtn.click();

    // 2. Verify arrives at Inventory & Transfers workstation
    await expect(
      page.locator("text=Multi-Branch Inventory & Transfers"),
    ).toBeVisible();

    // 3. Verify Point of Sale (POS) and Admin buttons are strictly hidden
    await expect(page.locator("#nav-pos-btn")).not.toBeVisible();
    await expect(page.locator("#mobile-nav-pos-btn")).not.toBeVisible();
    await expect(page.locator("#nav-admin-btn")).not.toBeVisible();
    await expect(page.locator("#mobile-nav-admin-btn")).not.toBeVisible();

    // 4. Verify Inventory navigation is present
    await expect(
      page.locator("#nav-inventory-btn:visible, #mobile-nav-inventory-btn:visible").first(),
    ).toBeVisible();
  });
});
