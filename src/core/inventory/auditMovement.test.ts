import { describe, it, expect } from "vitest";
import { recordStockMovement } from "./auditMovement";

describe("InventoryAuditSeam", () => {
  const currentStock = 50;

  it("records a Restock movement with positive quantity delta and updated balance", () => {
    const result = recordStockMovement({
      branchId: "branch-1",
      productId: "prod-1",
      currentStock,
      movementType: "Restock",
      quantity: 25,
      createdBy: "user-admin",
      notes: "Received shipment batch #441",
    });

    expect(result.success).toBe(true);
    expect(result.movement?.quantityDelta).toBe(25);
    expect(result.movement?.balanceAfter).toBe(75);
    expect(result.movement?.movementType).toBe("Restock");
  });

  it("records Waste/Spoilage with negative quantity delta and updated balance", () => {
    const result = recordStockMovement({
      branchId: "branch-1",
      productId: "prod-1",
      currentStock,
      movementType: "Waste/Spoilage",
      quantity: 5,
      createdBy: "user-manager",
      notes: "Expired milk cartons disposed",
    });

    expect(result.success).toBe(true);
    expect(result.movement?.quantityDelta).toBe(-5);
    expect(result.movement?.balanceAfter).toBe(45);
    expect(result.movement?.movementType).toBe("Waste/Spoilage");
  });

  it("records Gift/Promo with negative quantity delta and audit notes", () => {
    const result = recordStockMovement({
      branchId: "branch-1",
      productId: "prod-1",
      currentStock,
      movementType: "Gift/Promo",
      quantity: 2,
      createdBy: "user-manager",
      notes: "Store opening customer giveaway",
    });

    expect(result.success).toBe(true);
    expect(result.movement?.quantityDelta).toBe(-2);
    expect(result.movement?.balanceAfter).toBe(48);
  });

  it("records Sale with negative quantity delta", () => {
    const result = recordStockMovement({
      branchId: "branch-1",
      productId: "prod-1",
      currentStock,
      movementType: "Sale",
      quantity: 10,
      createdBy: "cashier-1",
      referenceId: "tx-999",
    });

    expect(result.success).toBe(true);
    expect(result.movement?.quantityDelta).toBe(-10);
    expect(result.movement?.balanceAfter).toBe(40);
  });

  it("rejects deduction when quantity exceeds current available stock", () => {
    const result = recordStockMovement({
      branchId: "branch-1",
      productId: "prod-1",
      currentStock: 10,
      movementType: "Waste/Spoilage",
      quantity: 15,
      createdBy: "user-manager",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/insufficient stock/i);
  });

  it("records INITIAL_STOCK with positive delta and sets initial balance", () => {
    const result = recordStockMovement({
      branchId: "branch-1",
      productId: "prod-new",
      currentStock: 0,
      movementType: "INITIAL_STOCK",
      quantity: 50,
      createdBy: "user-manager-1",
      notes: "Initial catalog product setup",
    });

    expect(result.success).toBe(true);
    expect(result.movement?.quantityDelta).toBe(50);
    expect(result.movement?.balanceAfter).toBe(50);
    expect(result.movement?.movementType).toBe("INITIAL_STOCK");
  });
});

