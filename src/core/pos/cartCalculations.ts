export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export type DiscountType = "percentage" | "fixed";

export interface Discount {
  type: DiscountType;
  value: number;
  label?: string;
}

export interface CartCalculationResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  amountTendered: number;
  changeAmount: number;
}

/**
 * Calculates cart totals, discounts, taxes, and change tendered.
 * Rounds to 2 decimal places to avoid floating point precision quirks.
 */
export function calculateCartTotals(
  items: CartItem[],
  taxRate: number = 0,
  discount?: Discount,
  amountTendered: number = 0,
): CartCalculationResult {
  const round2 = (num: number) =>
    Math.round((num + Number.EPSILON) * 100) / 100;

  const subtotal = round2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  let discountAmount = 0;
  if (discount && discount.value > 0) {
    if (discount.type === "percentage") {
      discountAmount = round2(subtotal * (discount.value / 100));
    } else {
      discountAmount = round2(discount.value);
    }
  }

  // Cap discount so it does not exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  const taxableAmount = round2(subtotal - discountAmount);
  const taxAmount = round2(taxableAmount * taxRate);
  const grandTotal = round2(taxableAmount + taxAmount);

  const changeAmount =
    amountTendered >= grandTotal ? round2(amountTendered - grandTotal) : 0;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    amountTendered,
    changeAmount,
  };
}
