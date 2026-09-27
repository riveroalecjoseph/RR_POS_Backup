export type MovementType =
  | "Sale"
  | "Restock"
  | "Waste/Spoilage"
  | "Inter-Branch Transfer"
  | "Gift/Promo"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "INITIAL_STOCK";

export interface StockMovementRecord {
  id: string;
  branchId: string;
  productId: string;
  movementType: MovementType;
  quantityDelta: number;
  balanceAfter: number;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface RecordMovementParams {
  branchId: string;
  productId: string;
  currentStock: number;
  movementType: MovementType;
  quantity: number;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
}

export interface RecordMovementResult {
  success: boolean;
  movement?: StockMovementRecord;
  newStock?: number;
  error?: string;
}

/**
 * Validates and computes stock movement deltas and audit records.
 */
export function recordStockMovement(
  params: RecordMovementParams,
): RecordMovementResult {
  const {
    branchId,
    productId,
    currentStock,
    movementType,
    quantity,
    referenceId,
    notes,
    createdBy,
  } = params;

  if (quantity <= 0) {
    return {
      success: false,
      error: "Quantity must be greater than zero.",
    };
  }

  const isDeduction =
    movementType === "Sale" ||
    movementType === "Waste/Spoilage" ||
    movementType === "Gift/Promo" ||
    movementType === "Inter-Branch Transfer";

  const quantityDelta = isDeduction ? -Math.abs(quantity) : Math.abs(quantity);
  const balanceAfter = currentStock + quantityDelta;

  if (balanceAfter < 0) {
    return {
      success: false,
      error: `Insufficient stock to perform ${movementType}. Current: ${currentStock}, Delta: ${quantityDelta}.`,
    };
  }

  const movement: StockMovementRecord = {
    id: "mov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    branchId,
    productId,
    movementType,
    quantityDelta,
    balanceAfter,
    referenceId,
    notes,
    createdBy,
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    movement,
    newStock: balanceAfter,
  };
}
