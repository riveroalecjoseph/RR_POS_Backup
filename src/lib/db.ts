import { openDB, DBSchema, IDBPDatabase } from "idb";
import {
  Branch,
  Category,
  Product,
  BranchStockItem,
  Transaction,
  StockMovement,
  TransferRecord,
  AuditLogEntry,
} from "../types";
import { OfflineOrderRecord } from "../core/offline/syncQueue";

interface PosInventoryDB extends DBSchema {
  branches: {
    key: string;
    value: Branch;
  };
  categories: {
    key: string;
    value: Category;
  };
  products: {
    key: string;
    value: Product;
    indexes: { "by-category": string };
  };
  branch_stock: {
    key: string; // composite key: `${branchId}_${productId}`
    value: BranchStockItem;
    indexes: { "by-branch": string; "by-product": string };
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: { "by-branch": string; "by-created-at": string };
  };
  transfers: {
    key: string;
    value: TransferRecord;
    indexes: { "by-source": string; "by-target": string; "by-status": string };
  };
  stock_movements: {
    key: string;
    value: StockMovement;
    indexes: { "by-branch": string; "by-product": string };
  };
  audit_logs: {
    key: string;
    value: AuditLogEntry;
    indexes: {
      "by-branch": string;
      "by-user": string;
      "by-created-at": string;
      "by-action": string;
    };
  };
  offline_sync_queue: {
    key: string;
    value: OfflineOrderRecord;
    indexes: { "by-status": string };
  };
}

const DB_NAME = "rr_pos_inventory_db";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<PosInventoryDB>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<PosInventoryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PosInventoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        // Upgrade migration: purge legacy mock data and stale cache
        if (oldVersion < 3) {
          if (db.objectStoreNames.contains("branches")) {
            transaction.objectStore("branches").clear();
          }
          if (db.objectStoreNames.contains("audit_logs")) {
            transaction.objectStore("audit_logs").clear();
          }
          if (db.objectStoreNames.contains("transactions")) {
            transaction.objectStore("transactions").clear();
          }
        }

        // Branches store
        if (!db.objectStoreNames.contains("branches")) {
          db.createObjectStore("branches", { keyPath: "id" });
        }
        // Categories store
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        // Products store
        if (!db.objectStoreNames.contains("products")) {
          const productStore = db.createObjectStore("products", {
            keyPath: "id",
          });
          productStore.createIndex("by-category", "categoryId");
        }
        // Branch stock store
        if (!db.objectStoreNames.contains("branch_stock")) {
          const stockStore = db.createObjectStore("branch_stock", {
            keyPath: "id",
          });
          stockStore.createIndex("by-branch", "branchId");
          stockStore.createIndex("by-product", "productId");
        }
        // Transactions store
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", {
            keyPath: "id",
          });
          txStore.createIndex("by-branch", "branchId");
          txStore.createIndex("by-created-at", "createdAt");
        }
        // Transfers store
        if (!db.objectStoreNames.contains("transfers")) {
          const transferStore = db.createObjectStore("transfers", {
            keyPath: "id",
          });
          transferStore.createIndex("by-source", "sourceBranchId");
          transferStore.createIndex("by-target", "targetBranchId");
          transferStore.createIndex("by-status", "status");
        }
        // Stock movements store
        if (!db.objectStoreNames.contains("stock_movements")) {
          const movementStore = db.createObjectStore("stock_movements", {
            keyPath: "id",
          });
          movementStore.createIndex("by-branch", "branchId");
          movementStore.createIndex("by-product", "productId");
        }
        // Audit logs store for owner/admin oversight
        if (!db.objectStoreNames.contains("audit_logs")) {
          const auditStore = db.createObjectStore("audit_logs", {
            keyPath: "id",
          });
          auditStore.createIndex("by-branch", "branchId");
          auditStore.createIndex("by-user", "userId");
          auditStore.createIndex("by-created-at", "timestamp");
          auditStore.createIndex("by-action", "actionType");
        }
        // Offline sync queue store
        if (!db.objectStoreNames.contains("offline_sync_queue")) {
          const queueStore = db.createObjectStore("offline_sync_queue", {
            keyPath: "id",
          });
          queueStore.createIndex("by-status", "status");
        }
      },
    });
  }
  return dbPromise;
}

// Clean slate: no hardcoded dummy branches; strictly populated from live database
export const INITIAL_BRANCHES: Branch[] = [];

export const INITIAL_CATEGORIES: Category[] = [
  { id: "cat-bev", name: "Beverages", slug: "beverages", color: "#0ea5e9" },
  {
    id: "cat-bak",
    name: "Bakery & Pastries",
    slug: "bakery",
    color: "#f59e0b",
  },
  {
    id: "cat-pro",
    name: "Fresh Produce",
    slug: "fresh-produce",
    color: "#10b981",
  },
  {
    id: "cat-snk",
    name: "Snacks & Confectionery",
    slug: "snacks",
    color: "#ec4899",
  },
  {
    id: "cat-ess",
    name: "Household Essentials",
    slug: "essentials",
    color: "#8b5cf6",
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    sku: "BEV-001",
    barcode: "4800016641011",
    name: "Cold Brew Reserve 500ml",
    description: "Single-origin arabica cold brew coffee, steeped 20 hours",
    categoryId: "cat-bev",
    categoryName: "Beverages",
    price: 165.0,
    costPrice: 75.0,
    isActive: true,
  },
  {
    id: "prod-002",
    sku: "BEV-002",
    barcode: "4800016641028",
    name: "Artisan Matcha Latte",
    description: "Ceremonial grade Uji matcha with steamed oat milk",
    categoryId: "cat-bev",
    categoryName: "Beverages",
    price: 185.0,
    costPrice: 80.0,
    isActive: true,
  },
  {
    id: "prod-003",
    sku: "BAK-001",
    barcode: "4800016642018",
    name: "Butter Croissant Premium",
    description: "Flaky 100% French butter croissant baked fresh daily",
    categoryId: "cat-bak",
    categoryName: "Bakery & Pastries",
    price: 120.0,
    costPrice: 45.0,
    isActive: true,
  },
  {
    id: "prod-004",
    sku: "BAK-002",
    barcode: "4800016642025",
    name: "Pain Au Chocolat",
    description: "Belgian dark chocolate rolled in laminated golden dough",
    categoryId: "cat-bak",
    categoryName: "Bakery & Pastries",
    price: 135.0,
    costPrice: 52.0,
    isActive: true,
  },
  {
    id: "prod-005",
    sku: "PRO-001",
    barcode: "4800016643015",
    name: "Organic Hass Avocado (2-Pack)",
    description: "Locally grown tree-ripened creamy avocados",
    categoryId: "cat-pro",
    categoryName: "Fresh Produce",
    price: 190.0,
    costPrice: 110.0,
    isActive: true,
  },
  {
    id: "prod-006",
    sku: "SNK-001",
    barcode: "4800016644012",
    name: "Truffle Sea Salt Kettle Chips",
    description: "Hand-cooked gourmet potato chips with black summer truffle",
    categoryId: "cat-snk",
    categoryName: "Snacks & Confectionery",
    price: 95.0,
    costPrice: 38.0,
    isActive: true,
  },
  {
    id: "prod-007",
    sku: "SNK-002",
    barcode: "4800016644029",
    name: "Dark Chocolate Almond Clusters",
    description:
      "70% cacao dark chocolate with slow-roasted Californian almonds",
    categoryId: "cat-snk",
    categoryName: "Snacks & Confectionery",
    price: 150.0,
    costPrice: 65.0,
    isActive: true,
  },
  {
    id: "prod-008",
    sku: "ESS-001",
    barcode: "4800016645019",
    name: "Eco Bamboo Straws & Cleaner",
    description:
      "Reusable organic bamboo straws with natural coconut fiber cleaner",
    categoryId: "cat-ess",
    categoryName: "Household Essentials",
    price: 140.0,
    costPrice: 48.0,
    isActive: true,
  },
  {
    id: "prod-009",
    sku: "BEV-003",
    barcode: "4800016641035",
    name: "Nitro Cold Brew Can 330ml",
    description: "Infused with pure nitrogen for a velvety head and naturally sweet finish",
    categoryId: "cat-bev",
    categoryName: "Beverages",
    price: 155.0,
    costPrice: 68.0,
    isActive: true,
  },
  {
    id: "prod-010",
    sku: "BEV-004",
    barcode: "4800016641042",
    name: "Sparkling Yuzu Lemonade",
    description: "Japanese yuzu extract infused with sparkling mountain spring water",
    categoryId: "cat-bev",
    categoryName: "Beverages",
    price: 140.0,
    costPrice: 55.0,
    isActive: true,
  },
  {
    id: "prod-011",
    sku: "BAK-003",
    barcode: "4800016642032",
    name: "Blueberry Sourdough Muffin",
    description: "Wild organic blueberries folded into slow-fermented cultured sourdough",
    categoryId: "cat-bak",
    categoryName: "Bakery & Pastries",
    price: 110.0,
    costPrice: 40.0,
    isActive: true,
  },
  {
    id: "prod-012",
    sku: "BAK-004",
    barcode: "4800016642049",
    name: "Almond Frangipane Tart",
    description: "All-butter shortcrust pastry filled with roasted almond frangipane cream",
    categoryId: "cat-bak",
    categoryName: "Bakery & Pastries",
    price: 160.0,
    costPrice: 65.0,
    isActive: true,
  },
  {
    id: "prod-013",
    sku: "PRO-002",
    barcode: "4800016643022",
    name: "Cavendish Bananas (1kg)",
    description: "Fresh naturally ripened Grade-A Cavendish bananas from Mindanao",
    categoryId: "cat-pro",
    categoryName: "Fresh Produce",
    price: 85.0,
    costPrice: 40.0,
    isActive: true,
  },
  {
    id: "prod-014",
    sku: "PRO-003",
    barcode: "4800016643039",
    name: "Japanese Sweet Strawberries",
    description: "Hand-picked fragrant greenhouse strawberries (300g clamshell pack)",
    categoryId: "cat-pro",
    categoryName: "Fresh Produce",
    price: 280.0,
    costPrice: 150.0,
    isActive: true,
  },
  {
    id: "prod-015",
    sku: "SNK-003",
    barcode: "4800016644036",
    name: "Smoked Paprika Roasted Cashews",
    description: "Slow-roasted whole jumbo cashews dusted with Spanish smoked pimentón",
    categoryId: "cat-snk",
    categoryName: "Snacks & Confectionery",
    price: 175.0,
    costPrice: 85.0,
    isActive: true,
  },
  {
    id: "prod-016",
    sku: "SNK-004",
    barcode: "4800016644043",
    name: "Matcha White Chocolate Cookies",
    description: "Soft-baked ceremonial matcha cookies studded with Belgian white chips",
    categoryId: "cat-snk",
    categoryName: "Snacks & Confectionery",
    price: 115.0,
    costPrice: 45.0,
    isActive: true,
  },
  {
    id: "prod-017",
    sku: "ESS-002",
    barcode: "4800016645026",
    name: "Castile Botanical Hand Soap 500ml",
    description: "Gentle plant-derived olive oil hand cleanser scented with eucalyptus oils",
    categoryId: "cat-ess",
    categoryName: "Household Essentials",
    price: 220.0,
    costPrice: 95.0,
    isActive: true,
  },
  {
    id: "prod-018",
    sku: "ESS-003",
    barcode: "4800016645033",
    name: "Swedish Reusable Dishcloth 3-Pack",
    description: "Ultra-absorbent 100% biodegradable natural cellulose cloths",
    categoryId: "cat-ess",
    categoryName: "Household Essentials",
    price: 180.0,
    costPrice: 70.0,
    isActive: true,
  },
];

/**
 * Automatically purges legacy mock records, dummy branches, and test sessions
 */
export async function purgeLegacyMockData(): Promise<void> {
  try {
    const db = await getDatabase();
    const tx = db.transaction(["branches", "audit_logs"], "readwrite");
    const allBranches = await tx.objectStore("branches").getAll();
    for (const b of allBranches) {
      if (
        b.id.startsWith("11111111") ||
        b.id.startsWith("22222222") ||
        b.id.startsWith("33333333") ||
        b.code === "BR-CENTRAL" ||
        b.code === "BR-NORTH" ||
        b.code === "BR-SOUTH" ||
        b.name === "Central Flagship Branch" ||
        b.name === "North Mall Hub" ||
        b.name === "South Express Kiosk"
      ) {
        await tx.objectStore("branches").delete(b.id);
      }
    }

    const allLogs = await tx.objectStore("audit_logs").getAll();
    for (const l of allLogs) {
      if (l.userId === "usr-admin-alec" || l.userName === "Eduardo Reyes") {
        await tx.objectStore("audit_logs").delete(l.id);
      }
    }
    await tx.done;
  } catch (err) {
    console.warn("Legacy mock purge check failed:", err);
  }
}

/**
 * Initializes IndexedDB for clean operation.
 * Does NOT seed dummy branches; data strictly reflects live state.
 */
export async function initializeDatabaseIfNeeded(): Promise<void> {
  await getDatabase();
  await purgeLegacyMockData();
}

/**
 * Resets local database stores for a fresh clean slate sync
 */
export async function clearLocalDataStore(): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    [
      "categories",
      "products",
      "branch_stock",
      "transfers",
      "transactions",
      "stock_movements",
      "audit_logs",
    ],
    "readwrite",
  );
  await tx.objectStore("categories").clear();
  await tx.objectStore("products").clear();
  await tx.objectStore("branch_stock").clear();
  await tx.objectStore("transfers").clear();
  await tx.objectStore("transactions").clear();
  await tx.objectStore("stock_movements").clear();
  await tx.objectStore("audit_logs").clear();
  await tx.done;
}
