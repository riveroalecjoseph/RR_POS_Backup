import { describe, it, expect, vi } from "vitest";
import {
  createOfflineOrderRecord,
  processSyncQueue,
  OfflineOrderRecord,
} from "./syncQueue";

describe("OfflineQueueSeam", () => {
  const sampleOrder = {
    branchId: "branch-1",
    cashierId: "cashier-1",
    subtotal: 300,
    taxAmount: 36,
    discountAmount: 0,
    grandTotal: 336,
    paymentMethod: "cash" as const,
    amountTendered: 350,
    changeAmount: 14,
    items: [
      {
        productId: "p1",
        productName: "Cold Brew",
        unitPrice: 150,
        quantity: 2,
        subtotal: 300,
      },
    ],
  };

  it("creates an offline order record with unique idempotency key and pending status", () => {
    const record = createOfflineOrderRecord(sampleOrder);

    expect(record.status).toBe("PENDING");
    expect(record.idempotencyKey).toBeDefined();
    expect(record.idempotencyKey.length).toBeGreaterThan(10);
    expect(record.order.grandTotal).toBe(336);
  });

  it("processes queue in FIFO order and marks successfully pushed records as SYNCED", async () => {
    const record1 = createOfflineOrderRecord({
      ...sampleOrder,
      subtotal: 100,
      grandTotal: 100,
    });
    const record2 = createOfflineOrderRecord({
      ...sampleOrder,
      subtotal: 200,
      grandTotal: 200,
    });

    const queue: OfflineOrderRecord[] = [record1, record2];

    const mockSyncHandler = vi
      .fn()
      .mockImplementation(async (_record: OfflineOrderRecord) => {
        return { success: true, remoteId: "remote-uuid-123" };
      });

    const result = await processSyncQueue(queue, mockSyncHandler);

    expect(mockSyncHandler).toHaveBeenCalledTimes(2);
    expect(result.syncedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.updatedQueue[0].status).toBe("SYNCED");
    expect(result.updatedQueue[1].status).toBe("SYNCED");
  });

  it("handles sync failures gracefully without breaking subsequent queue processing", async () => {
    const record1 = createOfflineOrderRecord(sampleOrder);
    const record2 = createOfflineOrderRecord(sampleOrder);

    const queue: OfflineOrderRecord[] = [record1, record2];

    // First fails (e.g. network glitch), second succeeds
    const mockSyncHandler = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce({ success: true, remoteId: "remote-uuid-456" });

    const result = await processSyncQueue(queue, mockSyncHandler);

    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.updatedQueue[0].status).toBe("FAILED");
    expect(result.updatedQueue[0].lastError).toMatch(/Network timeout/);
    expect(result.updatedQueue[1].status).toBe("SYNCED");
  });
});
