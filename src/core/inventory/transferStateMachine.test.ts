import { describe, it, expect } from "vitest";
import {
  dispatchTransfer,
  confirmTransferReceipt,
  TransferOrder,
  BranchInventoryMap,
} from "./transferStateMachine";

describe("TransferHandshakeSeam", () => {
  const initialStock: BranchInventoryMap = {
    "branch-1": { "p-coffee": 50, "p-tea": 20 },
    "branch-2": { "p-coffee": 5, "p-tea": 0 },
  };

  it("successfully dispatches stock from source branch to in_transit", () => {
    const items = [{ productId: "p-coffee", quantity: 15 }];
    const result = dispatchTransfer({
      transferNumber: "TRF-001",
      sourceBranchId: "branch-1",
      targetBranchId: "branch-2",
      items,
      currentInventory: initialStock,
      dispatchedBy: "user-manager-1",
    });

    expect(result.success).toBe(true);
    expect(result.transfer?.status).toBe("IN_TRANSIT");
    // Source stock deducted immediately: 50 - 15 = 35
    expect(result.updatedInventory["branch-1"]["p-coffee"]).toBe(35);
    // Target stock NOT yet credited while in transit: still 5
    expect(result.updatedInventory["branch-2"]["p-coffee"]).toBe(5);
  });

  it("rejects dispatch if source branch has insufficient stock", () => {
    const items = [{ productId: "p-coffee", quantity: 999 }];
    const result = dispatchTransfer({
      transferNumber: "TRF-002",
      sourceBranchId: "branch-1",
      targetBranchId: "branch-2",
      items,
      currentInventory: initialStock,
      dispatchedBy: "user-manager-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/insufficient stock/i);
  });

  it("rejects dispatch if source and target branch are the same", () => {
    const items = [{ productId: "p-coffee", quantity: 5 }];
    const result = dispatchTransfer({
      transferNumber: "TRF-003",
      sourceBranchId: "branch-1",
      targetBranchId: "branch-1",
      items,
      currentInventory: initialStock,
      dispatchedBy: "user-manager-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cannot transfer to the same branch/i);
  });

  it("successfully completes handshake on confirmTransferReceipt and credits target branch", () => {
    // Start with an in-transit order
    const inTransitOrder: TransferOrder = {
      id: "trf-123",
      transferNumber: "TRF-001",
      sourceBranchId: "branch-1",
      targetBranchId: "branch-2",
      status: "IN_TRANSIT",
      items: [{ productId: "p-coffee", quantitySent: 15 }],
      dispatchedBy: "user-manager-1",
      dispatchedAt: "2026-09-22T08:00:00Z",
    };

    const currentInventoryAfterDispatch: BranchInventoryMap = {
      "branch-1": { "p-coffee": 35, "p-tea": 20 },
      "branch-2": { "p-coffee": 5, "p-tea": 0 },
    };

    // Target confirms full receipt (15 units)
    const receiptItems = [{ productId: "p-coffee", quantityReceived: 15 }];
    const confirmResult = confirmTransferReceipt({
      transfer: inTransitOrder,
      receiptItems,
      currentInventory: currentInventoryAfterDispatch,
      receivedBy: "user-manager-2",
    });

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.transfer?.status).toBe("RECEIVED");
    // Target branch stock now credited: 5 + 15 = 20
    expect(confirmResult.updatedInventory["branch-2"]["p-coffee"]).toBe(20);
    expect(confirmResult.hasDiscrepancy).toBe(false);
  });

  it("detects and records discrepancy when received quantity is less than sent", () => {
    const inTransitOrder: TransferOrder = {
      id: "trf-124",
      transferNumber: "TRF-002",
      sourceBranchId: "branch-1",
      targetBranchId: "branch-2",
      status: "IN_TRANSIT",
      items: [{ productId: "p-coffee", quantitySent: 15 }],
      dispatchedBy: "user-manager-1",
      dispatchedAt: "2026-09-22T08:00:00Z",
    };

    const currentInventory: BranchInventoryMap = {
      "branch-1": { "p-coffee": 35, "p-tea": 20 },
      "branch-2": { "p-coffee": 5, "p-tea": 0 },
    };

    // 2 damaged or missing items, only 13 received
    const receiptItems = [
      {
        productId: "p-coffee",
        quantityReceived: 13,
        notes: "2 cans damaged in transit",
      },
    ];
    const confirmResult = confirmTransferReceipt({
      transfer: inTransitOrder,
      receiptItems,
      currentInventory,
      receivedBy: "user-manager-2",
      discrepancyNotes: "2 cans damaged/leaking upon inspection",
    });

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.transfer?.status).toBe("RECEIVED");
    expect(confirmResult.hasDiscrepancy).toBe(true);
    // Target branch only receives the 13 intact units: 5 + 13 = 18
    expect(confirmResult.updatedInventory["branch-2"]["p-coffee"]).toBe(18);
  });

  it("upserts stock into target branch even if target branch has never stocked that product before", () => {
    const inTransitOrder: TransferOrder = {
      id: "trf-125",
      transferNumber: "TRF-003",
      sourceBranchId: "branch-1",
      targetBranchId: "branch-2",
      status: "IN_TRANSIT",
      items: [{ productId: "p-brand-new-item", quantitySent: 10 }],
      dispatchedBy: "user-manager-1",
      dispatchedAt: "2026-09-22T08:00:00Z",
    };

    // Target branch (branch-2) has NO entry for p-brand-new-item
    const currentInventory: BranchInventoryMap = {
      "branch-1": { "p-brand-new-item": 40 },
      "branch-2": { "p-coffee": 5 },
    };

    const receiptItems = [{ productId: "p-brand-new-item", quantityReceived: 10 }];
    const confirmResult = confirmTransferReceipt({
      transfer: inTransitOrder,
      receiptItems,
      currentInventory,
      receivedBy: "user-manager-2",
    });

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.transfer?.status).toBe("RECEIVED");
    // New item successfully upserted into branch-2
    expect(confirmResult.updatedInventory["branch-2"]["p-brand-new-item"]).toBe(10);
  });

  describe("Inter-Branch Practice Mode Guardrails", () => {
    it("rejects transfer dispatch if source is Practice but target is Live", () => {
      const items = [{ productId: "p-coffee", quantity: 5 }];
      const result = dispatchTransfer({
        transferNumber: "TRF-PRAC-001",
        sourceBranchId: "branch-1",
        targetBranchId: "branch-2",
        items,
        currentInventory: initialStock,
        dispatchedBy: "user-manager-1",
        sourceIsPracticeMode: true,
        targetIsPracticeMode: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Guardrail violation.*Cannot transfer between Practice Mode and Live/i);
    });

    it("rejects transfer dispatch if source is Live but target is Practice", () => {
      const items = [{ productId: "p-coffee", quantity: 5 }];
      const result = dispatchTransfer({
        transferNumber: "TRF-PRAC-002",
        sourceBranchId: "branch-1",
        targetBranchId: "branch-2",
        items,
        currentInventory: initialStock,
        dispatchedBy: "user-manager-1",
        sourceIsPracticeMode: false,
        targetIsPracticeMode: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Guardrail violation.*Cannot transfer between Practice Mode and Live/i);
    });

    it("allows transfer dispatch when both source and target are in Practice Mode", () => {
      const items = [{ productId: "p-coffee", quantity: 10 }];
      const result = dispatchTransfer({
        transferNumber: "TRF-PRAC-003",
        sourceBranchId: "branch-1",
        targetBranchId: "branch-2",
        items,
        currentInventory: initialStock,
        dispatchedBy: "user-manager-1",
        sourceIsPracticeMode: true,
        targetIsPracticeMode: true,
      });

      expect(result.success).toBe(true);
      expect(result.transfer?.isPracticeMode).toBe(true);
      expect(result.transfer?.status).toBe("IN_TRANSIT");
      expect(result.updatedInventory["branch-1"]["p-coffee"]).toBe(40);
    });

    it("rejects receipt confirmation if receiver mode mismatches transfer mode", () => {
      const practiceOrder: TransferOrder = {
        id: "trf-prac-123",
        transferNumber: "TRF-PRAC-004",
        sourceBranchId: "branch-1",
        targetBranchId: "branch-2",
        status: "IN_TRANSIT",
        items: [{ productId: "p-coffee", quantitySent: 10 }],
        dispatchedBy: "user-manager-1",
        dispatchedAt: "2026-09-27T08:00:00Z",
        isPracticeMode: true,
      };

      const confirmResult = confirmTransferReceipt({
        transfer: practiceOrder,
        receiptItems: [{ productId: "p-coffee", quantityReceived: 10 }],
        currentInventory: initialStock,
        receivedBy: "user-manager-2",
        receiverIsPracticeMode: false, // Live branch trying to receive sandbox transfer
      });

      expect(confirmResult.success).toBe(false);
      expect(confirmResult.error).toMatch(/Guardrail violation.*Receiving branch mode \(Live\) does not match transfer mode \(Practice\)/i);
    });

    it("successfully confirms receipt when receiver is also in Practice Mode", () => {
      const practiceOrder: TransferOrder = {
        id: "trf-prac-124",
        transferNumber: "TRF-PRAC-005",
        sourceBranchId: "branch-1",
        targetBranchId: "branch-2",
        status: "IN_TRANSIT",
        items: [{ productId: "p-coffee", quantitySent: 10 }],
        dispatchedBy: "user-manager-1",
        dispatchedAt: "2026-09-27T08:00:00Z",
        isPracticeMode: true,
      };

      const currentInventory: BranchInventoryMap = {
        "branch-1": { "p-coffee": 40 },
        "branch-2": { "p-coffee": 5 },
      };

      const confirmResult = confirmTransferReceipt({
        transfer: practiceOrder,
        receiptItems: [{ productId: "p-coffee", quantityReceived: 10 }],
        currentInventory,
        receivedBy: "user-manager-2",
        receiverIsPracticeMode: true,
      });

      expect(confirmResult.success).toBe(true);
      expect(confirmResult.transfer?.status).toBe("RECEIVED");
      expect(confirmResult.transfer?.isPracticeMode).toBe(true);
      expect(confirmResult.updatedInventory["branch-2"]["p-coffee"]).toBe(15);
    });
  });
});
