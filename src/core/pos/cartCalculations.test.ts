import { describe, it, expect } from "vitest";
import { calculateCartTotals, CartItem, Discount } from "./cartCalculations";

describe("CartCalculationSeam", () => {
  const sampleItems: CartItem[] = [
    { productId: "p1", name: "Cold Brew", unitPrice: 150, quantity: 2 }, // 300
    { productId: "p2", name: "Butter Croissant", unitPrice: 120, quantity: 1 }, // 120
  ];

  it("calculates subtotal correctly from items with known literal expected value", () => {
    const result = calculateCartTotals(sampleItems, 0, undefined);
    // Subtotal: 300 + 120 = 420
    expect(result.subtotal).toBe(420);
    expect(result.taxAmount).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.grandTotal).toBe(420);
  });

  it("applies percentage discount before tax correctly", () => {
    const discount: Discount = { type: "percentage", value: 10 }; // 10% off 420 = 42.00
    const result = calculateCartTotals(sampleItems, 0, discount);
    expect(result.subtotal).toBe(420);
    expect(result.discountAmount).toBe(42);
    expect(result.grandTotal).toBe(378);
  });

  it("applies fixed amount discount capped at subtotal", () => {
    const discount: Discount = { type: "fixed", value: 50 };
    const result = calculateCartTotals(sampleItems, 0, discount);
    expect(result.discountAmount).toBe(50);
    expect(result.grandTotal).toBe(370);

    // Over-discount capped at subtotal
    const excessDiscount: Discount = { type: "fixed", value: 500 };
    const excessResult = calculateCartTotals(sampleItems, 0, excessDiscount);
    expect(excessResult.discountAmount).toBe(420);
    expect(excessResult.grandTotal).toBe(0);
  });

  it("computes sales tax (e.g. 12% VAT) on discounted taxable amount", () => {
    // Subtotal 420 - discount 20 = 400 taxable. 12% of 400 = 48.00 tax. Grand total = 448.00
    const discount: Discount = { type: "fixed", value: 20 };
    const result = calculateCartTotals(sampleItems, 0.12, discount);
    expect(result.taxAmount).toBe(48);
    expect(result.grandTotal).toBe(448);
  });

  it("calculates change due accurately given amount tendered", () => {
    const result = calculateCartTotals(sampleItems, 0.12, undefined, 500);
    // Subtotal 420 + 12% (50.40) = 470.40. Tendered: 500 -> Change: 29.60
    expect(result.grandTotal).toBe(470.4);
    expect(result.amountTendered).toBe(500);
    expect(result.changeAmount).toBe(29.6);
  });
});
