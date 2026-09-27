export type UserRole = "cashier" | "branch_manager" | "inventory_manager" | "super_admin";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  branchName?: string;
  mustChangePassword?: boolean;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  contactNumber?: string;
  isActive: boolean;
  isPracticeMode?: boolean;
  createdAt?: string;
}

export interface CreateBranchDTO {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  contactNumber?: string;
}

export interface UpdateBranchDTO {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  contactNumber?: string;
  isActive?: boolean;
  isPracticeMode?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string;
  displayOrder?: number;
  display_order?: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  price: number;
  costPrice: number;
  imageUrl?: string;
  isActive: boolean;
  unit?: string;
}

export interface CreateProductDTO {
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  costPrice?: number;
  initialStock?: number;
  lowStockThreshold?: number;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  costPrice?: number;
  barcode?: string;
}

export interface BranchStockItem {
  id: string;
  branchId: string;
  productId: string;
  product: Product;
  productName?: string;
  sku?: string;
  category?: string;
  unit?: string;
  quantity: number;
  lowStockThreshold: number;
  updatedAt: string;
  isPracticeMode?: boolean;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  branchId: string;
  cashierId?: string;
  cashierName?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: "cash" | "card" | "e_wallet";
  amountTendered: number;
  changeAmount: number;
  status: "completed" | "refunded" | "offline_synced";
  createdAt: string;
  items: TransactionItem[];
  isOffline?: boolean;
  notes?: string;
}

export type MovementType =
  | "Sale"
  | "Restock"
  | "Waste/Spoilage"
  | "Inter-Branch Transfer"
  | "Gift/Promo"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "INITIAL_STOCK";

export interface StockMovement {
  id: string;
  branchId: string;
  branchName?: string;
  productId: string;
  productName?: string;
  movementType: MovementType;
  type?: MovementType;
  quantityDelta: number;
  balanceAfter: number;
  referenceId?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  isPracticeMode?: boolean;
}

export type TransferStatus =
  "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface TransferItemRecord {
  id?: string;
  productId: string;
  productName?: string;
  sku?: string;
  quantitySent: number;
  quantityReceived?: number;
  notes?: string;
}

export interface TransferRecord {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceBranchName?: string;
  targetBranchId: string;
  targetBranchName?: string;
  status: TransferStatus;
  notes?: string;
  discrepancyNotes?: string;
  dispatchedBy: string;
  dispatchedByName?: string;
  receivedBy?: string;
  receivedByName?: string;
  dispatchedAt: string;
  receivedAt?: string;
  items: TransferItemRecord[];
  isPracticeMode?: boolean;
}

export type AuditActionType =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_PASSWORD_CHANGE"
  | "POS_SALE"
  | "INVENTORY_ADJUSTMENT"
  | "INVENTORY_PRODUCT_CREATED"
  | "INVENTORY_PRODUCT_UPDATED"
  | "INVENTORY_CATEGORY_CREATED"
  | "TRANSFER_DISPATCHED"
  | "TRANSFER_RECEIVED"
  | "STAFF_INVITED"
  | "STAFF_ROLE_UPDATED"
  | "BRANCH_SWITCH"
  | "SYSTEM_CONFIG";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userEmail?: string;
  branchId: string;
  branchName: string;
  actionType: AuditActionType;
  actionTitle: string;
  description: string;
  metadata?: Record<string, any>;
}

