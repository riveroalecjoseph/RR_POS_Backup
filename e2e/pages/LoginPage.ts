import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitBtn: Locator;
  readonly fillCashierBtn: Locator;
  readonly fillManagerBtn: Locator;
  readonly fillAdminBtn: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly savePasswordBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator("#login-email-input");
    this.passwordInput = page.locator("#login-password-input");
    this.submitBtn = page.locator("#login-submit-btn");
    this.fillCashierBtn = page.locator("#fill-cashier-btn");
    this.fillManagerBtn = page.locator("#fill-manager-btn");
    this.fillAdminBtn = page.locator("#fill-admin-btn");
    this.newPasswordInput = page.locator("#new-password-input");
    this.confirmPasswordInput = page.locator("#confirm-password-input");
    this.savePasswordBtn = page.locator("#save-new-password-btn");
  }

  async goto() {
    await this.page.goto("/");
  }

  async clickQuickFill(role: "cashier" | "manager" | "admin") {
    if (role === "cashier") {
      await this.emailInput.fill("cashier@retailpro.com");
      await this.passwordInput.fill("password123");
    } else if (role === "manager") {
      await this.emailInput.fill("manager@retailpro.com");
      await this.passwordInput.fill("password123");
    } else if (role === "admin") {
      await this.emailInput.fill("riveroalecjoseph@gmail.com");
      await this.passwordInput.fill("password123");
    }
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitBtn.click();
  }

  async changePassword(newPassword: string) {
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(newPassword);
    await this.savePasswordBtn.click();
  }
}
