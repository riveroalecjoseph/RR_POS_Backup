export type SyncStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";

export interface OrderItemPayload {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderPayload {
  branchId: string;
  cashierId?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: "cash" | "card" | "e_wallet";
  amountTendered: number;
  changeAmount: number;
  items: OrderItemPayload[];
  customerNote?: string;
}

export interface OfflineOrderRecord {
  id: string;
  idempotencyKey: string;
  order: OrderPayload;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  queuedAt: string;
  syncedAt?: string;
  remoteId?: string;
}

/**
 * Creates an offline transaction queue record with a collision-resistant idempotency key.
 */
export function createOfflineOrderRecord(
  order: OrderPayload,
): OfflineOrderRecord {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const idempotencyKey = `idemp_${order.branchId}_${timestamp}_${randomSuffix}`;

  return {
    id: `queue_${timestamp}_${randomSuffix}`,
    idempotencyKey,
    order,
    status: "PENDING",
    retryCount: 0,
    queuedAt: new Date().toISOString(),
  };
}

export interface SyncHandlerResponse {
  success: boolean;
  remoteId?: string;
}

export type SyncHandler = (
  record: OfflineOrderRecord,
) => Promise<SyncHandlerResponse>;

export interface ProcessQueueResult {
  syncedCount: number;
  failedCount: number;
  updatedQueue: OfflineOrderRecord[];
}

/**
 * Processes queued offline transactions in FIFO order.
 */
export async function processSyncQueue(
  queue: OfflineOrderRecord[],
  handler: SyncHandler,
): Promise<ProcessQueueResult> {
  const updatedQueue: OfflineOrderRecord[] = [];
  let syncedCount = 0;
  let failedCount = 0;

  for (const record of queue) {
    if (record.status === "SYNCED") {
      updatedQueue.push(record);
      continue;
    }

    try {
      const response = await handler(record);
      if (response.success) {
        syncedCount++;
        updatedQueue.push({
          ...record,
          status: "SYNCED",
          syncedAt: new Date().toISOString(),
          remoteId: response.remoteId,
          lastError: undefined,
        });
      } else {
        failedCount++;
        updatedQueue.push({
          ...record,
          status: "FAILED",
          retryCount: record.retryCount + 1,
          lastError: "Sync rejected by remote server",
        });
      }
    } catch (err: unknown) {
      failedCount++;
      const errorMessage =
        err instanceof Error ? err.message : "Unknown sync error";
      updatedQueue.push({
        ...record,
        status: "FAILED",
        retryCount: record.retryCount + 1,
        lastError: errorMessage,
      });
    }
  }

  return {
    syncedCount,
    failedCount,
    updatedQueue,
  };
}
