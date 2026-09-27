export type TransferStatus =
  "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface TransferItem {
  productId: string;
  quantitySent: number;
  quantityReceived?: number;
  notes?: string;
}

export interface TransferOrder {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  targetBranchId: string;
  status: TransferStatus;
  items: TransferItem[];
  notes?: string;
  discrepancyNotes?: string;
  dispatchedBy: string;
  receivedBy?: string;
  dispatchedAt: string;
  receivedAt?: string;
  isPracticeMode?: boolean;
}

// Maps branchId -> productId -> quantity
export type BranchInventoryMap = Record<string, Record<string, number>>;

export interface DispatchTransferParams {
  transferNumber: string;
  sourceBranchId: string;
  targetBranchId: string;
  items: Array<{ productId: string; quantity: number; notes?: string }>;
  currentInventory: BranchInventoryMap;
  dispatchedBy: string;
  notes?: string;
  sourceIsPracticeMode?: boolean;
  targetIsPracticeMode?: boolean;
}

export interface DispatchTransferResult {
  success: boolean;
  transfer?: TransferOrder;
  updatedInventory: BranchInventoryMap;
  error?: string;
}

export interface ConfirmReceiptParams {
  transfer: TransferOrder;
  receiptItems: Array<{
    productId: string;
    quantityReceived: number;
    notes?: string;
  }>;
  currentInventory: BranchInventoryMap;
  receivedBy: string;
  discrepancyNotes?: string;
  receiverIsPracticeMode?: boolean;
}

export interface ConfirmReceiptResult {
  success: boolean;
  transfer?: TransferOrder;
  updatedInventory: BranchInventoryMap;
  hasDiscrepancy: boolean;
  error?: string;
}

/**
 * Dispatches items from source branch into IN_TRANSIT.
 * Deducts stock from source immediately. Target stock is unaffected until confirmation.
 */
export function dispatchTransfer(
  params: DispatchTransferParams,
): DispatchTransferResult {
  const {
    transferNumber,
    sourceBranchId,
    targetBranchId,
    items,
    currentInventory,
    dispatchedBy,
    notes,
    sourceIsPracticeMode = false,
    targetIsPracticeMode = false,
  } = params;

  if (Boolean(sourceIsPracticeMode) !== Boolean(targetIsPracticeMode)) {
    return {
      success: false,
      updatedInventory: currentInventory,
      error:
        "Guardrail violation: Cannot transfer between Practice Mode and Live Production branches. Both source and target branches must operate in the same mode.",
    };
  }

  if (sourceBranchId === targetBranchId) {
    return {
      success: false,
      updatedInventory: currentInventory,
      error: "Cannot transfer to the same branch.",
    };
  }

  if (!items || items.length === 0) {
    return {
      success: false,
      updatedInventory: currentInventory,
      error: "Transfer must contain at least one item.",
    };
  }

  // Deep clone inventory map
  const updatedInventory: BranchInventoryMap = JSON.parse(
    JSON.stringify(currentInventory),
  );
  if (!updatedInventory[sourceBranchId]) updatedInventory[sourceBranchId] = {};
  if (!updatedInventory[targetBranchId]) updatedInventory[targetBranchId] = {};

  // Check stock availability in source branch
  for (const item of items) {
    const currentQty = updatedInventory[sourceBranchId][item.productId] ?? 0;
    if (currentQty < item.quantity) {
      return {
        success: false,
        updatedInventory: currentInventory,
        error: `Insufficient stock for product ${item.productId}. Available: ${currentQty}, Requested: ${item.quantity}`,
      };
    }
  }

  // Deduct from source branch
  for (const item of items) {
    updatedInventory[sourceBranchId][item.productId] -= item.quantity;
  }

  const transfer: TransferOrder = {
    id: "trf-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    transferNumber,
    sourceBranchId,
    targetBranchId,
    status: "IN_TRANSIT",
    items: items.map((i) => ({
      productId: i.productId,
      quantitySent: i.quantity,
      notes: i.notes,
    })),
    dispatchedBy,
    dispatchedAt: new Date().toISOString(),
    notes,
    isPracticeMode: Boolean(sourceIsPracticeMode),
  };

  return {
    success: true,
    transfer,
    updatedInventory,
  };
}

/**
 * Confirms receipt at receiving branch.
 * Credits actual received quantities to target branch inventory.
 */
export function confirmTransferReceipt(
  params: ConfirmReceiptParams,
): ConfirmReceiptResult {
  const {
    transfer,
    receiptItems,
    currentInventory,
    receivedBy,
    discrepancyNotes,
    receiverIsPracticeMode,
  } = params;

  if (
    receiverIsPracticeMode !== undefined &&
    Boolean(receiverIsPracticeMode) !== Boolean(transfer.isPracticeMode)
  ) {
    return {
      success: false,
      updatedInventory: currentInventory,
      hasDiscrepancy: false,
      error: `Guardrail violation: Receiving branch mode (${receiverIsPracticeMode ? "Practice" : "Live"}) does not match transfer mode (${transfer.isPracticeMode ? "Practice" : "Live"}).`,
    };
  }

  if (transfer.status !== "IN_TRANSIT") {
    return {
      success: false,
      updatedInventory: currentInventory,
      hasDiscrepancy: false,
      error: `Cannot confirm receipt. Current status is ${transfer.status}, expected IN_TRANSIT.`,
    };
  }

  const updatedInventory: BranchInventoryMap = JSON.parse(
    JSON.stringify(currentInventory),
  );
  const targetBranchId = transfer.targetBranchId;
  if (!updatedInventory[targetBranchId]) updatedInventory[targetBranchId] = {};

  let hasDiscrepancy = false;
  const updatedItems: TransferItem[] = [];

  for (const sentItem of transfer.items) {
    const receivedRecord = receiptItems.find(
      (r) => r.productId === sentItem.productId,
    );
    const qtyReceived =
      receivedRecord !== undefined
        ? receivedRecord.quantityReceived
        : sentItem.quantitySent;

    if (qtyReceived !== sentItem.quantitySent) {
      hasDiscrepancy = true;
    }

    updatedItems.push({
      ...sentItem,
      quantityReceived: qtyReceived,
      notes: receivedRecord?.notes || sentItem.notes,
    });

    // Credit confirmed intact quantity to target branch
    const currentTargetQty =
      updatedInventory[targetBranchId][sentItem.productId] ?? 0;
    updatedInventory[targetBranchId][sentItem.productId] =
      currentTargetQty + qtyReceived;
  }

  const updatedTransfer: TransferOrder = {
    ...transfer,
    status: "RECEIVED",
    items: updatedItems,
    receivedBy,
    receivedAt: new Date().toISOString(),
    discrepancyNotes:
      discrepancyNotes ||
      (hasDiscrepancy
        ? "Discrepancy detected between sent and received units."
        : undefined),
  };

  return {
    success: true,
    transfer: updatedTransfer,
    updatedInventory,
    hasDiscrepancy,
  };
}
