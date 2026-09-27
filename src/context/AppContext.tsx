import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Branch,
  CreateBranchDTO,
  UpdateBranchDTO,
  Category,
  Product,
  BranchStockItem,
  Transaction,
  StockMovement,
  TransferRecord,
  UserProfile,
  UserRole,
  MovementType,
  CreateProductDTO,
  UpdateProductDTO,
  AuditLogEntry,
  AppTab,
} from "../types";
import {
  getDatabase,
  initializeDatabaseIfNeeded,
} from "../lib/db";
import { supabase, isLiveSupabaseConfigured } from "../lib/supabase";
import {
  getPracticeBranchIds,
  setPracticeBranchIds,
  setPracticeModeSetting,
} from "../core/practiceMode";
import {
  calculateCartTotals,
  CartItem,
  Discount,
  CartCalculationResult,
} from "../core/pos/cartCalculations";
import { processSyncQueue } from "../core/offline/syncQueue";
import { recordStockMovement as coreRecordMovement } from "../core/inventory/auditMovement";
import {
  CACHED_TAB_KEY,
  getCachedUserProfile,
  setCachedUserProfile,
  clearCachedUserProfile,
  getCachedCurrentBranch,
  setCachedCurrentBranch,
  getCachedBranches,
  setCachedBranches,
  hasPotentialSupabaseSession,
} from "../core/auth/sessionCache";

interface AppContextType {
  // Authentication & Session
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  currentUser: UserProfile | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }>;
  logout: () => Promise<void>;
  resetPasswordForEmail: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserPassword: (
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  setCurrentUserRole: (role: UserRole) => void;

  // Practice Sandbox Mode (Configured per store/branch)
  isPracticeMode: boolean;
  togglePracticeMode: () => Promise<void>;
  practiceBranchIds: string[];
  isBranchInPracticeMode: (branchId: string) => boolean;
  toggleBranchPracticeMode: (branchId: string) => Promise<void>;
  setBranchPracticeMode: (branchId: string, enabled: boolean) => Promise<void>;
  purgePracticeData: (targetBranchId?: string) => Promise<{ success: boolean; error?: string }>;

  // Active Navigation Tab
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Branches
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  createBranch: (
    dto: CreateBranchDTO,
  ) => Promise<{ success: boolean; branch?: Branch; isLocalOnly?: boolean; error?: string }>;
  updateBranch: (
    branchId: string,
    updates: UpdateBranchDTO,
  ) => Promise<{ success: boolean; branch?: Branch; error?: string }>;
  deleteBranch: (
    branchId: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Online & Sync Status
  isOnline: boolean;
  toggleOnlineSimulation: () => void;
  pendingSyncCount: number;
  triggerSync: () => Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }>;
  isSyncing: boolean;

  // Catalog & Inventory Management
  categories: Category[];
  products: Product[];
  branchStock: BranchStockItem[];
  allBranchStock: BranchStockItem[];
  refreshData: () => Promise<void>;
  addProduct: (
    dto: CreateProductDTO,
  ) => Promise<{ success: boolean; product?: Product; error?: string }>;
  updateProduct: (
    productId: string,
    updates: UpdateProductDTO,
  ) => Promise<{ success: boolean; product?: Product; error?: string }>;
  addCategory: (
    name: string,
    color?: string,
    slug?: string,
    displayOrder?: number,
  ) => Promise<{ success: boolean; category?: Category; error?: string }>;
  updateCategory: (
    categoryId: string,
    name: string,
    color?: string,
    slug?: string,
    displayOrder?: number,
  ) => Promise<{ success: boolean; category?: Category; error?: string }>;
  deleteCategory: (
    categoryId: string,
    reassignToCategoryId?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // POS & Cart
  cartItems: CartItem[];
  discount?: Discount;
  taxRate: number;
  cartTotals: CartCalculationResult;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  applyDiscount: (discount?: Discount) => void;
  clearCart: () => void;
  processCheckout: (
    paymentMethod: "cash" | "card" | "e_wallet",
    amountTendered: number,
  ) => Promise<{ success: boolean; transaction?: Transaction; error?: string }>;

  // Stock Movement & Adjustments
  adjustStock: (
    productId: string,
    type: MovementType,
    quantity: number,
    notes?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  stockMovements: StockMovement[];

  // Transfers
  transfers: TransferRecord[];
  pendingReceiptsCount: number;
  dispatchTransfer: (
    targetBranchId: string,
    items: Array<{ productId: string; quantity: number }>,
    notes?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  confirmTransfer: (
    transferId: string,
    receiptItems: Array<{
      productId: string;
      quantityReceived: number;
      notes?: string;
    }>,
    discrepancyNotes?: string,
  ) => Promise<{ success: boolean; hasDiscrepancy: boolean; error?: string }>;

  // Transactions History
  transactions: Transaction[];

  // Audit Trail & Activity Monitoring
  auditLogs: AuditLogEntry[];
  logAuditEvent: (
    entry: Omit<AuditLogEntry, "id" | "timestamp">,
  ) => Promise<void>;

  // Realtime Transfer Alerts
  incomingTransferAlert: {
    id: string;
    transferNumber: string;
    sourceBranchName: string;
    timestamp: string;
  } | null;
  clearIncomingTransferAlert: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [branches, setBranches] = useState<Branch[]>(() =>
    getCachedBranches(),
  );
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(() =>
    getCachedCurrentBranch(),
  );

  // Authentication state (Synchronously hydrated from local storage to prevent login flash)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    getCachedUserProfile(),
  );
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => {
    if (!isLiveSupabaseConfigured) return false;
    const cached = getCachedUserProfile();
    if (cached) return false;
    return hasPotentialSupabaseSession();
  });
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    return (
      window.location.hash.includes("type=recovery") ||
      window.location.hash.includes("type=invite") ||
      window.location.pathname.includes("reset-password")
    );
  });

  // Keep active branch cached for instantaneous restoration on page reload
  useEffect(() => {
    setCachedCurrentBranch(currentBranch);
  }, [currentBranch]);

  // Practice Sandbox Branch IDs state (configured per store)
  const [practiceBranchIds, setPracticeBranchIdsState] = useState<string[]>(() =>
    getPracticeBranchIds(),
  );

  // Active store's practice mode state: true if current store is in practice mode
  const isPracticeMode = useMemo(() => {
    if (!currentBranch) return false;
    return (
      practiceBranchIds.includes(currentBranch.id) ||
      !!currentBranch.isPracticeMode
    );
  }, [currentBranch, practiceBranchIds]);

  // Active navigation tab (persists across reloads)
  const [activeTab, setActiveTabState] = useState<AppTab>(
    () => {
      try {
        const saved = localStorage.getItem(CACHED_TAB_KEY) as AppTab;
        if (saved && ["pos", "inventory", "transfers", "staff", "audit"].includes(saved)) {
          return saved;
        }
      } catch {}
      return "pos";
    },
  );

  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(CACHED_TAB_KEY, tab);
    } catch {}
  }, []);

  // Update default tab based on user role upon login (respecting RBAC)
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "branch_manager" || currentUser.role === "inventory_manager") {
        if (activeTab === "staff" || activeTab === "audit") {
          setActiveTabState("pos");
        }
      } else if (currentUser.role === "cashier") {
        setActiveTabState("pos");
      }
    }
  }, [currentUser?.id, currentUser?.role]);

  const isAuthenticated = currentUser !== null;

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Clean slate: start with empty arrays without dummy fallbacks
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allBranchStock, setAllBranchStock] = useState<BranchStockItem[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Realtime incoming transfer alert state
  const [incomingTransferAlert, setIncomingTransferAlert] = useState<{
    id: string;
    transferNumber: string;
    sourceBranchName: string;
    timestamp: string;
  } | null>(null);

  const clearIncomingTransferAlert = useCallback(() => {
    setIncomingTransferAlert(null);
  }, []);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<Discount | undefined>(undefined);
  const taxRate = 0.12;

  // Calculated totals
  const cartTotals = calculateCartTotals(cartItems, taxRate, discount);

  // Audit logging helper
  const logAuditEvent = useCallback(
    async (entry: Omit<AuditLogEntry, "id" | "timestamp">) => {
      try {
        const fullEntry: AuditLogEntry = {
          ...entry,
          id:
            "audit-" +
            Date.now() +
            "-" +
            Math.random().toString(36).substring(2, 7),
          timestamp: new Date().toISOString(),
        };
        setAuditLogs((prev) => [fullEntry, ...prev]);
        const db = await getDatabase();
        await db.put("audit_logs", fullEntry);
      } catch (err) {
        console.warn("Failed to persist audit log:", err);
      }
    },
    [],
  );

  // Helper to load or upsert profile for authenticated user
  const loadUserProfile = useCallback(
    async (user: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
    }): Promise<UserProfile> => {
      const email = (user.email || "").toLowerCase().trim();
      const isSuperAdminEmail = email === "riveroalecjoseph@gmail.com";

      // Extract role from app_metadata or user_metadata
      const appMetadata = (user as any).app_metadata || {};
      const userMetadata = (user as any).user_metadata || {};
      const metaRole = (appMetadata.role || userMetadata.role) as UserRole | undefined;

      const validRoles: UserRole[] = [
        "super_admin",
        "branch_manager",
        "inventory_manager",
        "cashier",
      ];

      // Check if user is recognized as super_admin by metadata or root email
      const isSuperAdminCandidate =
        isSuperAdminEmail || metaRole === "super_admin";

      let role: UserRole = isSuperAdminCandidate
        ? "super_admin"
        : metaRole && validRoles.includes(metaRole)
          ? metaRole === "inventory_manager"
            ? "branch_manager"
            : metaRole
          : "cashier";

      let fullName = isSuperAdminEmail
        ? "Alec Joseph Rivero"
        : (userMetadata.full_name as string) ||
          (user.user_metadata?.full_name as string) ||
          email.split("@")[0] ||
          "Staff Member";
      let branchId: string | null =
        (appMetadata.branch_id as string) ||
        (userMetadata.branch_id as string) ||
        branches[0]?.id ||
        null;
      let branchName =
        role === "super_admin"
          ? "Global Network Access"
          : branches[0]?.name || "Assigned Branch";

      if (isLiveSupabaseConfigured) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            // Check if profile in database has super_admin, or if auth metadata has super_admin, or isSuperAdminEmail
            if (profile.role === "super_admin" || isSuperAdminCandidate) {
              role = "super_admin";
            } else if (
              profile.role &&
              validRoles.includes(profile.role as UserRole)
            ) {
              role =
                profile.role === "inventory_manager"
                  ? "branch_manager"
                  : (profile.role as UserRole);
            } else if (metaRole && validRoles.includes(metaRole)) {
              role =
                metaRole === "inventory_manager"
                  ? "branch_manager"
                  : metaRole;
            }

            fullName = profile.full_name || fullName;
            if (role === "super_admin") {
              branchId = null;
              branchName = "Global Network Access";
            } else if (profile.branch_id) {
              branchId = profile.branch_id;
              const b = branches.find((br) => br.id === profile.branch_id);
              if (b) branchName = b.name;
            }

            // Guarantee super_admin role is synced in public.profiles
            if (role === "super_admin" && profile.role !== "super_admin") {
              try {
                await supabase
                  .from("profiles")
                  .update({
                    role: "super_admin",
                    branch_id: null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", user.id);
              } catch (e) {
                console.warn("Could not sync super_admin role to profiles:", e);
              }
            }
          } else {
            // First time login - attempt profile record creation with resolved role
            if (role === "super_admin") {
              branchId = null;
              branchName = "Global Network Access";
            }

            try {
              await supabase.from("profiles").insert({
                id: user.id,
                email,
                full_name: fullName,
                role,
                branch_id: role === "super_admin" ? null : branchId,
                is_active: true,
              });
            } catch (insertErr) {
              console.warn("Could not insert initial profile:", insertErr);
            }
          }
        } catch (err) {
          console.warn("Could not query or sync profile from Supabase:", err);
        }
      }

      const profileObj: UserProfile = {
        id: user.id,
        email,
        fullName,
        role,
        branchId: role === "super_admin" ? null : branchId,
        branchName:
          role === "super_admin" ? "Global Network Access" : branchName,
      };

      setCurrentUser(profileObj);
      setCachedUserProfile(profileObj);
      return profileObj;
    },
    [branches],
  );

  // Initialize Auth & listen to changes
  useEffect(() => {
    let isMounted = true;

    if (!isLiveSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    // Set up auth state change listener immediately
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        if (event === "PASSWORD_RECOVERY") {
          setIsRecoveryMode(true);
        } else if (event === "SIGNED_IN" && session?.user) {
          await loadUserProfile(session.user);
          setIsAuthLoading(false);
        } else if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          clearCachedUserProfile();
          setCachedCurrentBranch(null);
          setIsAuthLoading(false);
        }
      },
    );

    async function initAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          await loadUserProfile(session.user);
        } else if (!session && isMounted) {
          // If no active session in Supabase, clear stale local session
          setCurrentUser(null);
          clearCachedUserProfile();
          setCachedCurrentBranch(null);
        }
      } catch (err) {
        console.warn("Supabase getSession failed:", err);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Load catalog, inventory, and branch data (Clean slate from Supabase or IndexedDB)
  const refreshData = useCallback(async () => {
    try {
      await initializeDatabaseIfNeeded();
      const db = await getDatabase();

      if (isLiveSupabaseConfigured) {
        // Query live Supabase tables
        const [
          branchesRes,
          categoriesRes,
          productsRes,
          stockRes,
          transfersRes,
          transactionsRes,
          movementsRes,
        ] = await Promise.all([
          supabase.from("branches").select("*").eq("is_active", true),
          supabase.from("categories").select("*").order("name"),
          supabase.from("products").select("*").eq("is_active", true).order("name"),
          supabase.from("branch_stock").select("*"),
          supabase.from("transfers").select("*, items:transfer_items(*)").order("created_at", { ascending: false }),
          supabase.from("transactions").select("*, items:transaction_items(*)").order("created_at", { ascending: false }),
          supabase.from("stock_movements").select("*").order("created_at", { ascending: false }),
        ]);

        const practiceStockRes = await supabase
          .from("practice_branch_stock")
          .select("*")
          .then(
            (r) => r,
            () => ({ data: [] as any[] }),
          );

        // 1. Branches
        let branchList: Branch[] = [];
        const currentPracticeIds = getPracticeBranchIds();
        if (branchesRes.data && branchesRes.data.length > 0) {
          branchList = branchesRes.data.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            address: b.address,
            phone: b.phone,
            contactNumber: b.phone,
            isActive: b.is_active,
            isPracticeMode: Boolean(b.is_practice_mode) || currentPracticeIds.includes(b.id),
          }));
          setBranches(branchList);
          setCachedBranches(branchList);
          for (const b of branchList) {
            await db.put("branches", b);
          }
        } else {
          // If no branches in DB yet, query local IDB
          branchList = await db.getAll("branches");
          branchList = branchList.map((b) => ({
            ...b,
            isPracticeMode: currentPracticeIds.includes(b.id),
          }));
          setBranches(branchList);
          setCachedBranches(branchList);
        }

        if (branchList.length > 0) {
          setCurrentBranchState((prev) => {
            if (!prev) {
              const cached = getCachedCurrentBranch();
              if (cached) {
                const found = branchList.find((b) => b.id === cached.id);
                if (found) return found;
              }
              return branchList[0];
            }
            const found = branchList.find((b) => b.id === prev.id);
            if (!found) return branchList[0];
            if (found.id === prev.id) {
              return prev;
            }
            return found;
          });
        } else {
          setCurrentBranchState(null);
        }

        // 2. Categories (Clean slate: if empty array returned, stays empty)
        const categoryList: Category[] = (categoriesRes.data || [])
          .map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            color: c.color || "#10b981",
            displayOrder: c.display_order ?? c.displayOrder ?? 0,
            display_order: c.display_order ?? c.displayOrder ?? 0,
          }))
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        setCategories(categoryList);

        // 3. Products (Clean slate: if empty array returned, stays empty)
        const productList: Product[] = (productsRes.data || []).map((p) => {
          const cat = categoryList.find((c) => c.id === p.category_id);
          return {
            id: p.id,
            sku: p.sku,
            barcode: p.barcode,
            name: p.name,
            description: p.description,
            categoryId: p.category_id || "",
            categoryName: cat?.name || "General",
            price: Number(p.price) || 0,
            costPrice: Number(p.cost_price) || 0,
            imageUrl: p.image_url,
            isActive: p.is_active,
          };
        });
        setProducts(productList);

        // 4. Branch Stock (Live stock with Sandbox Practice Overlay)
        const practiceMap = new Map<string, number>();
        if (practiceStockRes?.data && Array.isArray(practiceStockRes.data)) {
          for (const ps of practiceStockRes.data) {
            practiceMap.set(`${ps.branch_id}_${ps.product_id}`, ps.quantity);
          }
        }

        const stockList: BranchStockItem[] = (stockRes.data || [])
          .map((s) => {
            const prod = productList.find((p) => p.id === s.product_id);
            if (!prod) return null;
            const branch = branchList.find((b) => b.id === s.branch_id);
            const isBranchPractice = Boolean(branch?.isPracticeMode);
            const key = `${s.branch_id}_${s.product_id}`;
            const practiceQty = practiceMap.get(key);

            const effectiveQuantity =
              isBranchPractice && practiceQty !== undefined
                ? practiceQty
                : s.quantity;

            return {
              id: key,
              branchId: s.branch_id,
              productId: s.product_id,
              product: prod,
              quantity: effectiveQuantity,
              lowStockThreshold: s.low_stock_threshold || 10,
              updatedAt: s.updated_at || new Date().toISOString(),
              isPracticeMode: isBranchPractice,
            };
          })
          .filter(Boolean) as BranchStockItem[];
        setAllBranchStock(stockList);

        // 5. Transfers
        const transferList: TransferRecord[] = (transfersRes.data || []).map((t) => {
          const sBranch = branchList.find((b) => b.id === t.source_branch_id);
          const tBranch = branchList.find((b) => b.id === t.target_branch_id);
          return {
            id: t.id,
            transferNumber: t.transfer_number,
            sourceBranchId: t.source_branch_id,
            sourceBranchName: sBranch?.name || "Source Branch",
            targetBranchId: t.target_branch_id,
            targetBranchName: tBranch?.name || "Target Branch",
            status: t.status,
            notes: t.notes,
            discrepancyNotes: t.discrepancy_notes,
            dispatchedBy: t.dispatched_by,
            dispatchedByName: "Staff",
            receivedBy: t.received_by,
            receivedByName: t.received_by ? "Staff" : undefined,
            dispatchedAt: t.dispatched_at || t.created_at,
            receivedAt: t.received_at,
            isPracticeMode: Boolean(t.is_practice_mode) || Boolean(t.notes?.includes("[Practice Mode]")),
            items: (t.items || []).map((item: any) => {
              const p = productList.find((pr) => pr.id === item.product_id);
              return {
                productId: item.product_id,
                productName: p?.name || "Item",
                sku: p?.sku || "",
                quantitySent: item.quantity_sent,
                quantityReceived: item.quantity_received,
                notes: item.notes,
              };
            }),
          };
        });
        setTransfers(transferList);

        // 6. Transactions
        const txList: Transaction[] = (transactionsRes.data || []).map((tx) => ({
          id: tx.id,
          transactionNumber: tx.transaction_number,
          branchId: tx.branch_id,
          cashierId: tx.cashier_id || "cashier",
          cashierName: "Staff",
          subtotal: Number(tx.subtotal) || 0,
          taxAmount: Number(tx.tax_amount) || 0,
          discountAmount: Number(tx.discount_amount) || 0,
          grandTotal: Number(tx.grand_total) || 0,
          paymentMethod: tx.payment_method,
          amountTendered: Number(tx.amount_tendered) || 0,
          changeAmount: Number(tx.change_amount) || 0,
          status: tx.status,
          createdAt: tx.created_at,
          isOffline: false,
          items: (tx.items || []).map((item: any) => ({
            id: item.id,
            transactionId: item.transaction_id,
            productId: item.product_id,
            productName: item.product_name,
            unitPrice: Number(item.unit_price) || 0,
            quantity: item.quantity,
            subtotal: Number(item.subtotal) || 0,
          })),
        }));
        setTransactions(txList);

        // 7. Stock movements
        const smList: StockMovement[] = (movementsRes.data || []).map((sm) => {
          const prod = productList.find((p) => p.id === sm.product_id);
          const br = branchList.find((b) => b.id === sm.branch_id);
          return {
            id: sm.id,
            branchId: sm.branch_id,
            branchName: br?.name || "Branch",
            productId: sm.product_id,
            productName: prod?.name || "Product",
            movementType: sm.movement_type,
            quantityDelta: sm.quantity_delta,
            balanceAfter: sm.balance_after,
            referenceId: sm.reference_id,
            notes: sm.notes,
            createdBy: sm.created_by,
            createdAt: sm.created_at,
            isPracticeMode: Boolean(sm.is_practice_mode) || Boolean(sm.notes?.includes("[Practice Mode]")),
          };
        });
        setStockMovements(smList);

        // Also fetch local audit logs & queue
        const logs = await db.getAll("audit_logs");
        setAuditLogs(
          logs.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          ),
        );
        const queue = await db.getAll("offline_sync_queue");
        const pending = queue.filter(
          (q) => q.status === "PENDING" || q.status === "FAILED",
        );
        setPendingSyncCount(pending.length);

        // 8. Re-verify and sync current user profile role if changed in Supabase
        if (currentUser?.id && !currentUser.id.startsWith("usr-")) {
          try {
            const { data: freshProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentUser.id)
              .maybeSingle();

            if (freshProfile && freshProfile.role && freshProfile.role !== currentUser.role) {
              const updatedUser: UserProfile = {
                ...currentUser,
                role: freshProfile.role as UserRole,
                fullName: freshProfile.full_name || currentUser.fullName,
                branchId: freshProfile.role === "super_admin" ? null : (freshProfile.branch_id || currentUser.branchId),
                branchName: freshProfile.role === "super_admin" ? "Global Network Access" : currentUser.branchName,
              };
              setCurrentUser(updatedUser);
              setCachedUserProfile(updatedUser);
            }
          } catch {
            // Ignore background profile sync error
          }
        }
      } else {
        // Purely local IndexedDB mode (when no Supabase credentials)
        const b = await db.getAll("branches");
        const c = await db.getAll("categories");
        const p = await db.getAll("products");
        const s = await db.getAll("branch_stock");
        const tr = await db.getAll("transfers");
        const tx = await db.getAll("transactions");
        const sm = await db.getAll("stock_movements");
        const logs = await db.getAll("audit_logs");
        const queue = await db.getAll("offline_sync_queue");

        setBranches(b);
        if (b.length > 0) {
          setCurrentBranchState((prev) => {
            if (!prev) return b[0];
            const found = b.find((br) => br.id === prev.id);
            if (found && found.id === prev.id) return prev;
            return found || b[0];
          });
        } else {
          setCurrentBranchState(null);
        }
        setCategories(
          (c || [])
            .map((cat) => ({
              ...cat,
              displayOrder: cat.displayOrder ?? cat.display_order ?? 0,
              display_order: cat.display_order ?? cat.displayOrder ?? 0,
            }))
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
        );
        setProducts(p);
        setAllBranchStock(s);
        setTransfers(
          tr.sort(
            (x, y) =>
              new Date(y.dispatchedAt).getTime() -
              new Date(x.dispatchedAt).getTime(),
          ),
        );
        setTransactions(
          tx.sort(
            (x, y) =>
              new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
          ),
        );
        setStockMovements(
          sm.sort(
            (x, y) =>
              new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
          ),
        );
        setAuditLogs(
          logs.sort(
            (x, y) =>
              new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime(),
          ),
        );

        const pending = queue.filter(
          (q) => q.status === "PENDING" || q.status === "FAILED",
        );
        setPendingSyncCount(pending.length);
      }
    } catch (err) {
      if (!import.meta.env.PROD) {
        console.error("Failed to refresh application data:", err);
      }
    }
  }, [currentBranch?.id]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const isBranchInPracticeMode = useCallback(
    (branchId: string): boolean => {
      if (!branchId) return false;
      return practiceBranchIds.includes(branchId);
    },
    [practiceBranchIds],
  );

  const toggleBranchPracticeMode = useCallback(
    async (branchId: string) => {
      if (currentUser && currentUser.role !== "super_admin") {
        alert("Only users with the Super Admin role can toggle Practice Mode.");
        return;
      }
      const isCurrentlyPractice = practiceBranchIds.includes(branchId);
      const nextPracticeBranchIds = isCurrentlyPractice
        ? practiceBranchIds.filter((id) => id !== branchId)
        : [...practiceBranchIds, branchId];

      setPracticeBranchIdsState(nextPracticeBranchIds);
      setPracticeBranchIds(nextPracticeBranchIds);
      setPracticeModeSetting(nextPracticeBranchIds.length > 0);

      // Update in-memory branches
      setBranches((prev) =>
        prev.map((b) =>
          b.id === branchId ? { ...b, isPracticeMode: !isCurrentlyPractice } : b,
        ),
      );

      setCurrentBranchState((prev) => {
        if (prev && prev.id === branchId) {
          return { ...prev, isPracticeMode: !isCurrentlyPractice };
        }
        return prev;
      });

      // Synchronize branch practice status to Supabase so other network terminals recognize it
      if (isLiveSupabaseConfigured) {
        try {
          await supabase
            .from("branches")
            .update({ is_practice_mode: !isCurrentlyPractice })
            .eq("id", branchId);
        } catch (err) {
          if (!import.meta.env.PROD) {
            console.warn("Could not sync branch practice status to Supabase:", err);
          }
        }
      }

      // When toggling Practice Mode OFF back to Live Production for this store:
      // Purge sandbox test sales, adjustments, and sandbox logs for this branch from both cloud and local storage,
      // and re-sync genuine live data from production PostgreSQL.
      if (isCurrentlyPractice) {
        try {
          if (isLiveSupabaseConfigured) {
            try {
              await supabase
                .from("transfers")
                .delete()
                .eq("is_practice_mode", true)
                .or(`source_branch_id.eq.${branchId},target_branch_id.eq.${branchId}`);
              await supabase
                .from("stock_movements")
                .delete()
                .eq("is_practice_mode", true)
                .eq("branch_id", branchId);
              await supabase
                .from("practice_branch_stock")
                .delete()
                .eq("branch_id", branchId);
            } catch (cloudErr) {
              if (!import.meta.env.PROD) {
                console.warn("Could not purge cloud sandbox records for branch:", branchId, cloudErr);
              }
            }
          }

          const db = await getDatabase();
          // 1. Purge sandbox transactions
          const localTxs = await db.getAll("transactions");
          for (const t of localTxs) {
            if (
              t.branchId === branchId &&
              (t.id.startsWith("tx-sandbox-") || t.notes?.includes("[Practice Mode]"))
            ) {
              await db.delete("transactions", t.id);
            }
          }
          // 2. Purge sandbox stock movements
          const localMovements = await db.getAll("stock_movements");
          for (const m of localMovements) {
            if (
              m.branchId === branchId &&
              (m.isPracticeMode || m.notes?.includes("[Practice Mode]"))
            ) {
              await db.delete("stock_movements", m.id);
            }
          }
          // 3. Purge sandbox audit entries
          const localLogs = await db.getAll("audit_logs");
          for (const l of localLogs) {
            if (
              l.branchId === branchId &&
              l.description?.includes("[Practice Mode Sandbox]")
            ) {
              await db.delete("audit_logs", l.id);
            }
          }
          // 4. Purge sandbox transfers
          const localTransfers = await db.getAll("transfers");
          for (const tr of localTransfers) {
            if (
              (tr.isPracticeMode || tr.notes?.includes("[Practice Mode]")) &&
              (tr.sourceBranchId === branchId || tr.targetBranchId === branchId)
            ) {
              await db.delete("transfers", tr.id);
            }
          }
        } catch (err) {
          if (!import.meta.env.PROD) {
            console.warn("Could not purge practice sandbox records for branch:", branchId, err);
          }
        }

        await refreshData();
      }
    },
    [currentUser, practiceBranchIds, refreshData],
  );

  const purgePracticeData = useCallback(
    async (targetBranchId?: string): Promise<{ success: boolean; error?: string }> => {
      if (currentUser && currentUser.role !== "super_admin") {
        return {
          success: false,
          error: "Only Super Admins can purge practice sandbox data.",
        };
      }
      try {
        if (isLiveSupabaseConfigured) {
          if (targetBranchId) {
            await supabase
              .from("transfers")
              .delete()
              .eq("is_practice_mode", true)
              .or(`source_branch_id.eq.${targetBranchId},target_branch_id.eq.${targetBranchId}`);
            await supabase
              .from("stock_movements")
              .delete()
              .eq("is_practice_mode", true)
              .eq("branch_id", targetBranchId);
            await supabase
              .from("practice_branch_stock")
              .delete()
              .eq("branch_id", targetBranchId);
          } else {
            await supabase.from("transfers").delete().eq("is_practice_mode", true);
            await supabase.from("stock_movements").delete().eq("is_practice_mode", true);
            await supabase.from("practice_branch_stock").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          }
        }

        const db = await getDatabase();
        const localTransfers = await db.getAll("transfers");
        for (const tr of localTransfers) {
          if (tr.isPracticeMode || tr.notes?.includes("[Practice Mode]")) {
            if (!targetBranchId || tr.sourceBranchId === targetBranchId || tr.targetBranchId === targetBranchId) {
              await db.delete("transfers", tr.id);
            }
          }
        }
        await refreshData();
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "Failed to purge practice sandbox data.",
        };
      }
    },
    [currentUser, refreshData],
  );

  const togglePracticeMode = useCallback(async () => {
    if (!currentBranch) {
      alert("Please select a store to toggle Practice Mode.");
      return;
    }
    await toggleBranchPracticeMode(currentBranch.id);
  }, [currentBranch, toggleBranchPracticeMode]);

  const setBranchPracticeMode = useCallback(
    async (branchId: string, enabled: boolean) => {
      const isCurrentlyPractice = practiceBranchIds.includes(branchId);
      if (isCurrentlyPractice !== enabled) {
        await toggleBranchPracticeMode(branchId);
      }
    },
    [practiceBranchIds, toggleBranchPracticeMode],
  );

  // Supabase Realtime Subscription for transfers, stock, catalog, staff, and transactions
  useEffect(() => {
    if (!isLiveSupabaseConfigured) return;

    let debounceTimer: any = null;
    const triggerRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshData();
      }, 300);
    };

    const realtimeChannel = supabase
      .channel("audit-stream-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transfers" },
        (payload: any) => {
          triggerRefresh();
          // Detect incoming dispatch to current branch
          if (
            payload.eventType === "INSERT" ||
            (payload.eventType === "UPDATE" &&
              payload.new?.status === "IN_TRANSIT")
          ) {
            const newT = payload.new;
            if (
              newT &&
              currentBranch &&
              newT.target_branch_id === currentBranch.id &&
              newT.status === "IN_TRANSIT"
            ) {
              const srcBranch = branches.find(
                (b) => b.id === newT.source_branch_id,
              );
              setIncomingTransferAlert({
                id: newT.id,
                transferNumber: newT.transfer_number || "TRF-PENDING",
                sourceBranchName: srcBranch?.name || "Another Branch",
                timestamp: new Date().toISOString(),
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transfer_items" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branch_stock" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movements" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_logs" },
        triggerRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "branches" },
        triggerRefresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Connected to live postgres_changes broadcast stream");
        }
      });

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(realtimeChannel);
    };
  }, [refreshData, currentBranch?.id, branches]);

  // Online / Offline listeners with automatic catchup sync on reconnection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Re-fetch latest server state to reconcile events missed while offline
      refreshData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshData]);

  // Filter stock for current active branch
  const branchStock = allBranchStock.filter(
    (item) => currentBranch && item.branchId === currentBranch.id,
  );

  // Pending receipts count for receiving branch
  const pendingReceiptsCount = transfers.filter(
    (t) =>
      t.status === "IN_TRANSIT" &&
      currentBranch &&
      t.targetBranchId === currentBranch.id,
  ).length;

  const toggleOnlineSimulation = () => {
    setIsOnline((prev) => !prev);
  };

  const setCurrentUserRole = (role: UserRole) => {
    if (!currentUser) return;
    const updated = { ...currentUser, role };
    setCurrentUser(updated);
    setCachedUserProfile(updated);
  };

  const setCurrentBranch = (branch: Branch) => {
    setCurrentBranchState(branch);
    setCachedCurrentBranch(branch);
    if (currentUser) {
      const updated = {
        ...currentUser,
        branchId: branch.id,
        branchName: branch.name,
      };
      setCurrentUser(updated);
      setCachedUserProfile(updated);

      logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        branchId: branch.id,
        branchName: branch.name,
        actionType: "BRANCH_SWITCH",
        actionTitle: "Branch View Switched",
        description: `${currentUser.fullName} switched active branch view to ${branch.name}.`,
      });
    }
  };

  // Real Supabase Authentication: Email & Password Sign In
  const login = async (
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
  }> => {
    const cleanEmail = email.toLowerCase().trim();

    if (isLiveSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error || !data.user) {
          return {
            success: false,
            error:
              error?.message ||
              "Invalid email or password. Please verify your credentials.",
          };
        }

        const profile = await loadUserProfile(data.user);

        await logAuditEvent({
          userId: profile.id,
          userName: profile.fullName,
          userRole: profile.role,
          userEmail: profile.email,
          branchId: profile.branchId || "",
          branchName: profile.branchName || "Global",
          actionType: "AUTH_LOGIN",
          actionTitle: "Staff Sign-In",
          description: `${profile.fullName} (${profile.role.replace("_", " ")}) authenticated successfully via Supabase Auth.`,
        });

        return {
          success: true,
          user: profile,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "An unexpected error occurred during login.",
        };
      }
    } else {
      // Local fallback only when Supabase is unconfigured
      const isSuperAdmin =
        cleanEmail === "riveroalecjoseph@gmail.com" ||
        cleanEmail.includes("admin");
      const profile: UserProfile = {
        id: "usr-" + Date.now(),
        email: cleanEmail,
        fullName: isSuperAdmin ? "Alec Joseph Rivero" : cleanEmail.split("@")[0],
        role: isSuperAdmin ? "super_admin" : "cashier",
        branchId: branches[0]?.id || null,
        branchName: branches[0]?.name || (isSuperAdmin ? "Global Network Access" : "Assigned Branch"),
      };
      setCurrentUser(profile);
      setCachedUserProfile(profile);
      return { success: true, user: profile };
    }
  };

  // Sign out
  const logout = async () => {
    if (currentUser) {
      await logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        branchId: currentBranch?.id || "",
        branchName: currentBranch?.name || "Global",
        actionType: "AUTH_LOGOUT",
        actionTitle: "Staff Sign-Out",
        description: `${currentUser.fullName} signed out of active terminal session.`,
      });
    }

    if (isLiveSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase sign out error:", err);
      }
    }

    setCurrentUser(null);
    clearCachedUserProfile();
    setCachedCurrentBranch(null);
    setIsAuthLoading(false);
  };

  // Reset password request
  const resetPasswordForEmail = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isLiveSupabaseConfigured) {
      return {
        success: true,
      };
    }

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to send reset link." };
    }
  };

  // Update password
  const updateUserPassword = async (
    newPassword: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isLiveSupabaseConfigured) {
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setIsRecoveryMode(false);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to update password.",
      };
    }
  };

  // Product Management: Create
  const addProduct = async (
    dto: CreateProductDTO,
  ): Promise<{ success: boolean; product?: Product; error?: string }> => {
    try {
      const db = await getDatabase();
      const existing = await db.getAll("products");
      if (existing.some((p) => p.sku.toLowerCase() === dto.sku.toLowerCase())) {
        return {
          success: false,
          error: `Product with SKU "${dto.sku}" already exists.`,
        };
      }

      const category = categories.find((c) => c.id === dto.categoryId);
      let newProductId = "prod-" + Date.now();

      // In Live Mode (and not in Practice Sandbox), write directly to Supabase
      if (!isPracticeMode && isLiveSupabaseConfigured) {
        const { data: prodRow, error: prodErr } = await supabase
          .from("products")
          .insert({
            sku: dto.sku,
            barcode: dto.barcode || null,
            name: dto.name,
            description: dto.description || null,
            category_id:
              dto.categoryId && dto.categoryId.length === 36
                ? dto.categoryId
                : null,
            price: dto.price,
            cost_price: dto.costPrice ?? 0,
            is_active: true,
          })
          .select()
          .single();

        if (prodErr || !prodRow) {
          return {
            success: false,
            error: prodErr?.message || "Failed to insert product into Supabase.",
          };
        }
        newProductId = prodRow.id;

        // Insert initial stock in Supabase for each branch
        const initialStockQty = dto.initialStock ?? 0;
        const lowThreshold = dto.lowStockThreshold ?? 10;

        for (const b of branches) {
          await supabase.from("branch_stock").insert({
            branch_id: b.id,
            product_id: newProductId,
            quantity: b.id === currentBranch?.id ? initialStockQty : 0,
            low_stock_threshold: lowThreshold,
          });
        }

        // Log immutable audit entry in stock_movements in Supabase
        if (currentBranch) {
          await supabase.from("stock_movements").insert({
            branch_id: currentBranch.id,
            product_id: newProductId,
            movement_type: "INITIAL_STOCK",
            quantity_delta: initialStockQty,
            balance_after: initialStockQty,
            reference_id: `INIT-${newProductId.slice(0, 8)}`,
            notes: `Initial stock registration for ${dto.name}`,
            created_by:
              currentUser?.id && !currentUser.id.startsWith("usr-")
                ? currentUser.id
                : null,
          });
        }
      }

      const newProduct: Product = {
        id: newProductId,
        sku: dto.sku,
        barcode: dto.barcode || `BAR-${Date.now().toString().slice(-8)}`,
        name: dto.name,
        description: dto.description || "",
        categoryId: dto.categoryId,
        categoryName: category?.name || "General",
        price: dto.price,
        costPrice: dto.costPrice ?? 0,
        isActive: true,
      };

      await db.put("products", newProduct);

      for (const b of branches) {
        const stockKey = `${b.id}_${newProduct.id}`;
        const stockItem: BranchStockItem = {
          id: stockKey,
          branchId: b.id,
          productId: newProduct.id,
          product: newProduct,
          quantity: b.id === currentBranch?.id ? (dto.initialStock ?? 0) : 0,
          lowStockThreshold: dto.lowStockThreshold ?? 10,
          updatedAt: new Date().toISOString(),
        };
        await db.put("branch_stock", stockItem);
      }

      // Log immutable audit entry in local IndexedDB stock_movements
      if (currentBranch) {
        const initialStockQty = dto.initialStock ?? 0;
        const initialMovement: StockMovement = {
          id: "mov-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
          branchId: currentBranch.id,
          branchName: currentBranch.name,
          productId: newProduct.id,
          productName: newProduct.name,
          movementType: "INITIAL_STOCK",
          type: "INITIAL_STOCK",
          quantityDelta: initialStockQty,
          balanceAfter: initialStockQty,
          referenceId: `INIT-${newProduct.id.slice(0, 8)}`,
          notes: `Initial stock registration for ${newProduct.name}`,
          createdBy: currentUser?.id,
          createdByName: currentUser?.fullName,
          createdAt: new Date().toISOString(),
          isPracticeMode: Boolean(isPracticeMode),
        };
        await db.put("stock_movements", initialMovement);
        setStockMovements((prev) => [initialMovement, ...prev]);
      }

      await refreshData();

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Staff",
        userRole: currentUser?.role || "inventory_manager",
        userEmail: currentUser?.email,
        branchId: currentBranch?.id || "",
        branchName: currentBranch?.name || "All Branches",
        actionType: "INVENTORY_PRODUCT_CREATED",
        actionTitle: `Created Product: ${newProduct.name}`,
        description: `Added product "${newProduct.name}" (SKU: ${newProduct.sku}) priced at ₱${newProduct.price.toFixed(2)}${isPracticeMode ? " [Practice Mode Sandbox]" : ""}.`,
      });

      return { success: true, product: newProduct };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to create product." };
    }
  };

  // Product Management: Update
  const updateProduct = async (
    productId: string,
    updates: UpdateProductDTO,
  ): Promise<{ success: boolean; product?: Product; error?: string }> => {
    try {
      const db = await getDatabase();
      const existing = await db.get("products", productId);
      if (!existing) {
        return { success: false, error: "Product not found." };
      }

      const category = updates.categoryId
        ? categories.find((c) => c.id === updates.categoryId)
        : undefined;

      const updatedProduct: Product = {
        ...existing,
        name: updates.name ?? existing.name,
        description: updates.description ?? existing.description,
        categoryId: updates.categoryId ?? existing.categoryId,
        categoryName: category ? category.name : existing.categoryName,
        price: updates.price ?? existing.price,
        costPrice: updates.costPrice ?? existing.costPrice,
        barcode: updates.barcode ?? existing.barcode,
      };

      // In Live Mode, update Supabase directly
      if (!isPracticeMode && isLiveSupabaseConfigured) {
        await supabase
          .from("products")
          .update({
            name: updatedProduct.name,
            description: updatedProduct.description,
            price: updatedProduct.price,
            cost_price: updatedProduct.costPrice,
            barcode: updatedProduct.barcode,
            category_id:
              updatedProduct.categoryId &&
              updatedProduct.categoryId.length === 36
                ? updatedProduct.categoryId
                : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);
      }

      await db.put("products", updatedProduct);

      const allStocks = await db.getAll("branch_stock");
      for (const s of allStocks) {
        if (s.productId === productId) {
          s.product = updatedProduct;
          s.updatedAt = new Date().toISOString();
          await db.put("branch_stock", s);
        }
      }

      await refreshData();

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Staff",
        userRole: currentUser?.role || "inventory_manager",
        userEmail: currentUser?.email,
        branchId: currentBranch?.id || "",
        branchName: currentBranch?.name || "All Branches",
        actionType: "INVENTORY_PRODUCT_UPDATED",
        actionTitle: `Updated Product: ${updatedProduct.name}`,
        description: `Updated details for "${updatedProduct.name}" (SKU: ${updatedProduct.sku})${isPracticeMode ? " [Practice Mode Sandbox]" : ""}.`,
      });

      return { success: true, product: updatedProduct };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update product." };
    }
  };

  // Category Management: Add
  const addCategory = async (
    name: string,
    color?: string,
    slugInput?: string,
    displayOrderInput?: number,
  ): Promise<{ success: boolean; category?: Category; error?: string }> => {
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        return { success: false, error: "Category name is required." };
      }

      const db = await getDatabase();
      const existing = await db.getAll("categories");
      if (existing.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        return { success: false, error: `Category "${trimmed}" already exists.` };
      }

      const finalSlug = (slugInput && slugInput.trim())
        ? slugInput.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
        : trimmed.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

      if (existing.some((c) => c.slug.toLowerCase() === finalSlug.toLowerCase())) {
        return { success: false, error: `Category slug "${finalSlug}" already exists.` };
      }

      const assignedColor = color || "#10b981";
      const displayOrder = typeof displayOrderInput === "number" ? displayOrderInput : existing.length + 1;
      let catId = "cat-" + Date.now();

      if (!isPracticeMode && isLiveSupabaseConfigured) {
        const { data, error } = await supabase
          .from("categories")
          .insert({
            name: trimmed,
            slug: finalSlug,
            color: assignedColor,
            display_order: displayOrder,
          })
          .select()
          .single();

        if (error || !data) {
          return {
            success: false,
            error: error?.message || "Failed to insert category into Supabase.",
          };
        }
        catId = data.id;
      }

      const newCategory: Category = {
        id: catId,
        name: trimmed,
        slug: finalSlug,
        color: assignedColor,
        displayOrder,
        display_order: displayOrder,
      };

      await db.put("categories", newCategory);
      setCategories((prev) =>
        [...prev, newCategory].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        ),
      );

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Staff",
        userRole: currentUser?.role || "branch_manager",
        userEmail: currentUser?.email,
        branchId: currentBranch?.id || "",
        branchName: currentBranch?.name || "Global",
        actionType: "INVENTORY_CATEGORY_CREATED",
        actionTitle: `Created Category: ${newCategory.name}`,
        description: `Registered category "${newCategory.name}" (Slug: ${newCategory.slug}, Order: ${newCategory.displayOrder}).`,
      });

      return { success: true, category: newCategory };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to add category." };
    }
  };

  const updateCategory = async (
    categoryId: string,
    name: string,
    color?: string,
    slugInput?: string,
    displayOrderInput?: number,
  ): Promise<{ success: boolean; category?: Category; error?: string }> => {
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        return { success: false, error: "Category name is required." };
      }

      const db = await getDatabase();
      const existing = await db.get("categories", categoryId);
      if (!existing) {
        return { success: false, error: "Category not found." };
      }

      const finalSlug = (slugInput && slugInput.trim())
        ? slugInput.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
        : existing.slug;

      const displayOrder = typeof displayOrderInput === "number" ? displayOrderInput : (existing.displayOrder ?? 0);

      const updatedCategory: Category = {
        ...existing,
        name: trimmed,
        slug: finalSlug,
        color: color || existing.color,
        displayOrder,
        display_order: displayOrder,
      };

      if (!isPracticeMode && isLiveSupabaseConfigured) {
        await supabase
          .from("categories")
          .update({
            name: trimmed,
            slug: finalSlug,
            color: updatedCategory.color,
            display_order: displayOrder,
          })
          .eq("id", categoryId);
      }

      await db.put("categories", updatedCategory);
      await refreshData();
      return { success: true, category: updatedCategory };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update category." };
    }
  };

  const deleteCategory = async (
    categoryId: string,
    _reassignToCategoryId?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDatabase();
      const existing = await db.get("categories", categoryId);
      if (!existing) {
        return { success: false, error: "Category not found." };
      }

      if (!isPracticeMode && isLiveSupabaseConfigured) {
        await supabase.from("categories").delete().eq("id", categoryId);
      }

      await db.delete("categories", categoryId);
      await refreshData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to delete category." };
    }
  };

  // Cart operations
  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id,
      );
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex].quantity += quantity;
        return copy;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity,
          },
        ];
      }
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const applyDiscount = (newDiscount?: Discount) => {
    setDiscount(newDiscount);
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscount(undefined);
  };

  // POS Checkout process: Live writes to Supabase / Local Sandbox in Practice Mode
  const processCheckout = async (
    paymentMethod: "cash" | "card" | "e_wallet",
    amountTendered: number,
  ): Promise<{
    success: boolean;
    transaction?: Transaction;
    error?: string;
  }> => {
    if (!currentBranch) return { success: false, error: "No branch selected." };
    if (cartItems.length === 0)
      return { success: false, error: "Cart is empty." };

    const totals = calculateCartTotals(
      cartItems,
      taxRate,
      discount,
      amountTendered,
    );
    if (paymentMethod === "cash" && amountTendered < totals.grandTotal) {
      return {
        success: false,
        error: "Tendered amount is less than grand total.",
      };
    }

    try {
      const db = await getDatabase();
      const txNumber = `TX-${Date.now().toString().slice(-6)}`;
      const cashierId = currentUser?.id || "cashier-staff";
      const cashierName = currentUser?.fullName || "Staff Member";

      let transactionId = isPracticeMode
        ? "tx-sandbox-" + Date.now()
        : "tx-" + Date.now();

      // If LIVE mode and connected to Supabase: commit to production tables
      if (!isPracticeMode && isLiveSupabaseConfigured) {
        const { data: txRow, error: txError } = await supabase
          .from("transactions")
          .insert({
            transaction_number: txNumber,
            branch_id: currentBranch.id,
            cashier_id:
              cashierId && !cashierId.startsWith("usr-") ? cashierId : null,
            subtotal: totals.subtotal,
            tax_amount: totals.taxAmount,
            discount_amount: totals.discountAmount,
            grand_total: totals.grandTotal,
            payment_method: paymentMethod,
            amount_tendered:
              paymentMethod === "cash" ? amountTendered : totals.grandTotal,
            change_amount: totals.changeAmount,
            status: "completed",
          })
          .select()
          .single();

        if (txError || !txRow) {
          throw new Error(
            txError?.message || "Failed to commit transaction to Supabase.",
          );
        }
        transactionId = txRow.id;

        // Insert items
        const itemsToInsert = cartItems.map((item) => ({
          transaction_id: transactionId,
          product_id: item.productId,
          product_name: item.name,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.unitPrice * item.quantity,
        }));
        await supabase.from("transaction_items").insert(itemsToInsert);

        // Deduct branch stock & record stock movement in Supabase
        for (const item of cartItems) {
          const { data: stockRow } = await supabase
            .from("branch_stock")
            .select("id, quantity")
            .eq("branch_id", currentBranch.id)
            .eq("product_id", item.productId)
            .maybeSingle();

          const newQty = Math.max(0, (stockRow?.quantity || 0) - item.quantity);
          if (stockRow) {
            await supabase
              .from("branch_stock")
              .update({
                quantity: newQty,
                updated_at: new Date().toISOString(),
              })
              .eq("id", stockRow.id);
          }

          await supabase.from("stock_movements").insert({
            branch_id: currentBranch.id,
            product_id: item.productId,
            movement_type: "Sale",
            quantity_delta: -item.quantity,
            balance_after: newQty,
            reference_id: txNumber,
            notes: `POS Checkout (${paymentMethod})`,
            created_by:
              cashierId && !cashierId.startsWith("usr-") ? cashierId : null,
          });
        }
      }

      const newTransaction: Transaction = {
        id: transactionId,
        transactionNumber: txNumber,
        branchId: currentBranch.id,
        cashierId,
        cashierName,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        grandTotal: totals.grandTotal,
        paymentMethod,
        amountTendered:
          paymentMethod === "cash" ? amountTendered : totals.grandTotal,
        changeAmount: totals.changeAmount,
        status: "completed",
        createdAt: new Date().toISOString(),
        isOffline: false,
        notes: isPracticeMode ? "[Practice Mode Sandbox]" : undefined,
        items: cartItems.map((item) => ({
          id: "txi-" + Math.random().toString(36).substring(2, 9),
          transactionId,
          productId: item.productId,
          productName: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.unitPrice * item.quantity,
        })),
      };

      // Always update local IDB mirror
      await db.put("transactions", newTransaction);

      for (const item of cartItems) {
        const stockKey = `${currentBranch.id}_${item.productId}`;
        const existingStock = await db.get("branch_stock", stockKey);
        if (existingStock) {
          const newQty = Math.max(0, existingStock.quantity - item.quantity);
          existingStock.quantity = newQty;
          existingStock.updatedAt = new Date().toISOString();
          await db.put("branch_stock", existingStock);

          const movementAudit = coreRecordMovement({
            branchId: currentBranch.id,
            productId: item.productId,
            currentStock: existingStock.quantity + item.quantity,
            movementType: "Sale",
            quantity: item.quantity,
            referenceId: newTransaction.transactionNumber,
            createdBy: cashierId,
            notes: `POS Checkout (${paymentMethod})${isPracticeMode ? " [Practice Mode]" : ""}`,
          });

          if (movementAudit.success && movementAudit.movement) {
            await db.put("stock_movements", {
              id: movementAudit.movement.id,
              branchId: currentBranch.id,
              branchName: currentBranch.name,
              productId: item.productId,
              productName: item.name,
              movementType: "Sale",
              quantityDelta: movementAudit.movement.quantityDelta,
              balanceAfter: movementAudit.movement.balanceAfter,
              referenceId: newTransaction.transactionNumber,
              notes: movementAudit.movement.notes,
              createdBy: cashierId,
              createdByName: cashierName,
              createdAt: movementAudit.movement.createdAt,
            });
          }
        }
      }

      clearCart();
      await refreshData();

      await logAuditEvent({
        userId: cashierId,
        userName: cashierName,
        userRole: currentUser?.role || "cashier",
        userEmail: currentUser?.email,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        actionType: "POS_SALE",
        actionTitle: `Completed Sale ${txNumber}`,
        description: `Rung up ${newTransaction.items.length} item(s) totaling ₱${totals.grandTotal.toFixed(2)} via ${paymentMethod}${isPracticeMode ? " [Practice Mode Sandbox]" : ""}.`,
        metadata: {
          transactionNumber: txNumber,
          grandTotal: totals.grandTotal,
          paymentMethod,
          isPracticeMode,
        },
      });

      return { success: true, transaction: newTransaction };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to process sale." };
    }
  };

  // Stock Adjustment: Live writes to Supabase / Local Sandbox in Practice Mode
  const adjustStock = async (
    productId: string,
    type: MovementType,
    quantity: number,
    notes?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentBranch) return { success: false, error: "No branch selected." };

    try {
      const db = await getDatabase();
      const stockKey = `${currentBranch.id}_${productId}`;
      const stockItem = await db.get("branch_stock", stockKey);
      const product = await db.get("products", productId);

      if (!stockItem || !product) {
        return { success: false, error: "Stock record or product not found." };
      }

      const movementResult = coreRecordMovement({
        branchId: currentBranch.id,
        productId,
        currentStock: stockItem.quantity,
        movementType: type,
        quantity,
        notes,
        createdBy: currentUser?.id,
      });

      if (!movementResult.success || !movementResult.movement) {
        return {
          success: false,
          error: movementResult.error || "Adjustment rejected.",
        };
      }

      // If LIVE mode: mutate Supabase
      if (!isPracticeMode && isLiveSupabaseConfigured) {
        await supabase
          .from("branch_stock")
          .update({
            quantity: movementResult.newStock!,
            updated_at: new Date().toISOString(),
          })
          .eq("branch_id", currentBranch.id)
          .eq("product_id", productId);

        await supabase.from("stock_movements").insert({
          branch_id: currentBranch.id,
          product_id: productId,
          movement_type: type,
          quantity_delta: movementResult.movement.quantityDelta,
          balance_after: movementResult.newStock!,
          notes: notes || null,
          created_by:
            currentUser?.id && !currentUser.id.startsWith("usr-")
              ? currentUser.id
              : null,
        });
      }

      stockItem.quantity = movementResult.newStock!;
      stockItem.updatedAt = new Date().toISOString();
      await db.put("branch_stock", stockItem);

      await db.put("stock_movements", {
        id: movementResult.movement.id,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        productId,
        productName: product.name,
        movementType: type,
        quantityDelta: movementResult.movement.quantityDelta,
        balanceAfter: movementResult.movement.balanceAfter,
        notes,
        createdBy: currentUser?.id,
        createdByName: currentUser?.fullName,
        createdAt: movementResult.movement.createdAt,
      });

      await refreshData();

      await logAuditEvent({
        userId: currentUser?.id || "user-anon",
        userName: currentUser?.fullName || "Staff",
        userRole: currentUser?.role || "inventory_manager",
        userEmail: currentUser?.email,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        actionType: "INVENTORY_ADJUSTMENT",
        actionTitle: `Stock Adjustment: ${product.name}`,
        description: `Adjusted stock for ${product.name} by ${movementResult.movement.quantityDelta > 0 ? "+" : ""}${movementResult.movement.quantityDelta} (${type}). New balance: ${movementResult.newStock} units${isPracticeMode ? " [Practice Mode Sandbox]" : ""}.`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to adjust stock." };
    }
  };

  // Branch Management (CRUD)
  const createBranch = async (
    branchData: CreateBranchDTO,
  ): Promise<{ success: boolean; branch?: Branch; isLocalOnly?: boolean; error?: string }> => {
    try {
      const db = await getDatabase();
      const code = branchData.code.trim().toUpperCase();
      const name = branchData.name.trim();

      if (!name || !code) {
        return { success: false, error: "Branch name and code are required." };
      }

      if (branches.some((b) => b.code.toUpperCase() === code)) {
        return { success: false, error: `Branch code "${code}" already exists.` };
      }

      let newBranch: Branch;
      let isLocalFallback = false;

      if (!isPracticeMode && isLiveSupabaseConfigured) {
        const { data, error } = await supabase
          .from("branches")
          .insert({
            name,
            code,
            address: branchData.address || null,
            phone: branchData.contactNumber || branchData.phone || null,
            is_active: true,
          })
          .select()
          .single();

        if (error || !data) {
          if (
            error?.code === "42501" ||
            error?.message?.includes("permission denied") ||
            error?.message?.includes("row-level security")
          ) {
            console.warn(
              "Supabase public.branches table returned permission denied. Storing branch locally in IndexedDB.",
              error,
            );
            isLocalFallback = true;
            newBranch = {
              id: "br-" + Date.now(),
              name,
              code,
              address: branchData.address || "",
              phone: branchData.contactNumber || branchData.phone || "",
              contactNumber: branchData.contactNumber || branchData.phone || "",
              isActive: true,
              isPracticeMode: false,
              createdAt: new Date().toISOString(),
            };
          } else {
            throw new Error(error?.message || "Failed to create branch in database.");
          }
        } else {
          newBranch = {
            id: data.id,
            name: data.name,
            code: data.code,
            address: data.address || "",
            phone: data.phone || "",
            contactNumber: data.phone || "",
            isActive: data.is_active ?? true,
            isPracticeMode: false,
            createdAt: data.created_at || new Date().toISOString(),
          };
        }
      } else {
        newBranch = {
          id: "br-" + Date.now(),
          name,
          code,
          address: branchData.address || "",
          phone: branchData.contactNumber || branchData.phone || "",
          contactNumber: branchData.contactNumber || branchData.phone || "",
          isActive: true,
          isPracticeMode: false,
          createdAt: new Date().toISOString(),
        };
      }

      await db.put("branches", newBranch);
      setBranches((prev) => [...prev.filter((b) => b.id !== newBranch.id), newBranch]);

      // Automatically initialize branch_stock rows with quantity: 0 for all existing catalog products so the new store is instantly primed for transfers
      const initialBranchStock: BranchStockItem[] = [];
      for (const prod of products) {
        const stockKey = `${newBranch.id}_${prod.id}`;
        const stockItem: BranchStockItem = {
          id: stockKey,
          branchId: newBranch.id,
          productId: prod.id,
          product: prod,
          quantity: 0,
          lowStockThreshold: 10,
          updatedAt: new Date().toISOString(),
        };
        await db.put("branch_stock", stockItem);
        initialBranchStock.push(stockItem);

        if (!isPracticeMode && isLiveSupabaseConfigured && !isLocalFallback) {
          try {
            await supabase.from("branch_stock").insert({
              branch_id: newBranch.id,
              product_id: prod.id,
              quantity: 0,
              low_stock_threshold: 10,
            });
          } catch {
            // benign insert error fallback
          }
        }
      }

      if (initialBranchStock.length > 0) {
        setAllBranchStock((prev) => [...prev, ...initialBranchStock]);
      }

      if (!currentBranch) {
        setCurrentBranch(newBranch);
      }

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Admin",
        userRole: currentUser?.role || "super_admin",
        userEmail: currentUser?.email,
        branchId: newBranch.id,
        branchName: newBranch.name,
        actionType: "SYSTEM_CONFIG",
        actionTitle: `Branch Created: ${newBranch.name}`,
        description: `Created new branch "${newBranch.name}" (${newBranch.code})${isPracticeMode ? " [Practice Mode Sandbox]" : ""}.`,
      });

      return { success: true, branch: newBranch, isLocalOnly: isLocalFallback };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to create branch." };
    }
  };

  const updateBranch = async (
    id: string,
    updates: UpdateBranchDTO,
  ): Promise<{ success: boolean; branch?: Branch; error?: string }> => {
    try {
      const db = await getDatabase();
      const existing = branches.find((b) => b.id === id);
      if (!existing) {
        return { success: false, error: "Branch not found." };
      }

      const updatedCode = updates.code !== undefined ? updates.code.trim().toUpperCase() : existing.code;
      if (updatedCode && updatedCode !== existing.code) {
        if (branches.some((b) => b.id !== id && b.code.toUpperCase() === updatedCode)) {
          return { success: false, error: `Branch code "${updatedCode}" is already taken.` };
        }
      }

      if (!isPracticeMode && isLiveSupabaseConfigured) {
        const updatePayload: Record<string, any> = {};
        if (updates.name !== undefined) updatePayload.name = updates.name.trim();
        if (updates.code !== undefined) updatePayload.code = updatedCode;
        if (updates.address !== undefined) updatePayload.address = updates.address;
        if (updates.contactNumber !== undefined || updates.phone !== undefined) {
          updatePayload.phone = updates.contactNumber ?? updates.phone ?? null;
        }
        if (updates.isActive !== undefined) updatePayload.is_active = updates.isActive;

        const { error } = await supabase
          .from("branches")
          .update(updatePayload)
          .eq("id", id);

        if (error) {
          if (
            error.code === "42501" ||
            error.message?.includes("permission denied") ||
            error.message?.includes("row-level security")
          ) {
            console.warn("Supabase public.branches update permission denied. Updating local IndexedDB mirror.", error);
          } else {
            throw new Error(error.message || "Failed to update branch in database.");
          }
        }
      }

      if (updates.isPracticeMode !== undefined) {
        await setBranchPracticeMode(id, updates.isPracticeMode);
      }

      const updatedBranch: Branch = {
        ...existing,
        ...updates,
        code: updatedCode,
        name: updates.name !== undefined ? updates.name.trim() : existing.name,
        phone: updates.phone ?? updates.contactNumber ?? existing.phone,
        contactNumber: updates.contactNumber ?? updates.phone ?? existing.contactNumber,
      };

      await db.put("branches", updatedBranch);
      setBranches((prev) => prev.map((b) => (b.id === id ? updatedBranch : b)));

      if (currentBranch?.id === id) {
        setCurrentBranch(updatedBranch);
      }

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Admin",
        userRole: currentUser?.role || "super_admin",
        userEmail: currentUser?.email,
        branchId: updatedBranch.id,
        branchName: updatedBranch.name,
        actionType: "SYSTEM_CONFIG",
        actionTitle: `Branch Updated: ${updatedBranch.name}`,
        description: `Updated branch settings for "${updatedBranch.name}" (${updatedBranch.code}).`,
      });

      return { success: true, branch: updatedBranch };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update branch." };
    }
  };

  const deleteBranch = async (
    id: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const db = await getDatabase();
      const branchToDelete = branches.find((b) => b.id === id);
      if (!branchToDelete) {
        return { success: false, error: "Branch not found." };
      }

      // 1. Check local IndexedDB active stock
      const allStock = await db.getAll("branch_stock");
      const branchStockWithQty = allStock.filter(
        (s) => s.branchId === id && (s.quantity || 0) > 0,
      );
      if (branchStockWithQty.length > 0) {
        return {
          success: false,
          error: `Cannot delete branch "${branchToDelete.name}". It currently holds ${branchStockWithQty.length} product(s) with active stock. Please adjust or transfer out all stock first.`,
        };
      }

      // 2. Check local IndexedDB transactions
      const allTx = await db.getAll("transactions");
      const branchTx = allTx.filter((t) => t.branchId === id);
      if (branchTx.length > 0) {
        return {
          success: false,
          error: `Cannot delete branch "${branchToDelete.name}". It has ${branchTx.length} recorded sales transactions. To preserve audit integrity, please archive/deactivate this branch instead of deleting it.`,
        };
      }

      // 3. Check Supabase if live
      if (!isPracticeMode && isLiveSupabaseConfigured) {
        const { count: stockCount } = await supabase
          .from("branch_stock")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", id)
          .gt("quantity", 0);

        if (stockCount && stockCount > 0) {
          return {
            success: false,
            error: `Cannot delete branch "${branchToDelete.name}". Active stock remains attached in the database.`,
          };
        }

        const { count: txCount } = await supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("branch_id", id);

        if (txCount && txCount > 0) {
          return {
            success: false,
            error: `Cannot delete branch "${branchToDelete.name}". Transaction history is attached to this branch. Consider archiving it instead.`,
          };
        }

        const { error: delErr } = await supabase
          .from("branches")
          .delete()
          .eq("id", id);

        if (delErr) {
          throw new Error(delErr.message || "Failed to delete branch in Supabase.");
        }
      }

      await db.delete("branches", id);
      setBranches((prev) => {
        const next = prev.filter((b) => b.id !== id);
        if (currentBranch?.id === id) {
          if (next.length > 0) {
            setCurrentBranch(next[0]);
          } else {
            setCurrentBranchState(null);
          }
        }
        return next;
      });

      await logAuditEvent({
        userId: currentUser?.id || "admin",
        userName: currentUser?.fullName || "Admin",
        userRole: currentUser?.role || "super_admin",
        userEmail: currentUser?.email,
        branchId: branchToDelete.id,
        branchName: branchToDelete.name,
        actionType: "SYSTEM_CONFIG",
        actionTitle: `Branch Safely Deleted: ${branchToDelete.name}`,
        description: `Safely deleted empty branch "${branchToDelete.name}" (${branchToDelete.code}).`,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to delete branch." };
    }
  };

  // Dispatch transfer
  const dispatchTransfer = async (
    targetBranchId: string,
    items: Array<{ productId: string; quantity: number }>,
    notes?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentBranch) return { success: false, error: "No branch selected." };
    if (items.length === 0) return { success: false, error: "No items selected." };

    const targetBranch = branches.find((b) => b.id === targetBranchId);
    if (!targetBranch) return { success: false, error: "Target branch not found." };

    // GUARDRAIL: Strict boundary check between Practice Mode and Live Production
    const sourceIsPractice = isPracticeMode;
    const targetIsPractice = isBranchInPracticeMode(targetBranch.id) || Boolean(targetBranch.isPracticeMode);

    if (sourceIsPractice !== targetIsPractice) {
      return {
        success: false,
        error: `Guardrail violation: Cannot transfer products between a Practice Mode branch (${sourceIsPractice ? "Practice" : "Live"}) and a Live Production branch (${targetIsPractice ? "Practice" : "Live"}). Both branches must operate in the same mode.`,
      };
    }

    try {
      const db = await getDatabase();
      const transferNumber = `TR-${Date.now().toString().slice(-6)}`;
      let transferId = "trf-" + Date.now();

      if (isLiveSupabaseConfigured) {
        const { data: trRow, error: trErr } = await supabase
          .from("transfers")
          .insert({
            transfer_number: transferNumber,
            source_branch_id: currentBranch.id,
            target_branch_id: targetBranchId,
            status: "IN_TRANSIT",
            notes: notes ? `${notes}${sourceIsPractice ? " [Practice Mode Sandbox]" : ""}` : (sourceIsPractice ? "[Practice Mode Sandbox]" : null),
            dispatched_by:
              currentUser?.id && !currentUser.id.startsWith("usr-")
                ? currentUser.id
                : null,
            dispatched_at: new Date().toISOString(),
            is_practice_mode: sourceIsPractice,
          })
          .select()
          .single();

        if (trErr || !trRow) {
          throw new Error(trErr?.message || "Failed to create transfer in Supabase.");
        }
        transferId = trRow.id;

        const trItems = items.map((i) => ({
          transfer_id: transferId,
          product_id: i.productId,
          quantity_sent: i.quantity,
        }));
        await supabase.from("transfer_items").insert(trItems);

        for (const item of items) {
          if (sourceIsPractice) {
            // Deduct from practice_branch_stock without mutating live branch_stock
            const { data: pStockRow } = await supabase
              .from("practice_branch_stock")
              .select("quantity")
              .eq("branch_id", currentBranch.id)
              .eq("product_id", item.productId)
              .maybeSingle();

            let currentQty = 0;
            if (pStockRow) {
              currentQty = pStockRow.quantity;
            } else {
              const { data: liveStock } = await supabase
                .from("branch_stock")
                .select("quantity")
                .eq("branch_id", currentBranch.id)
                .eq("product_id", item.productId)
                .maybeSingle();
              currentQty = liveStock?.quantity || 0;
            }
            const newStockQty = Math.max(0, currentQty - item.quantity);

            await supabase
              .from("practice_branch_stock")
              .upsert({
                branch_id: currentBranch.id,
                product_id: item.productId,
                quantity: newStockQty,
                updated_at: new Date().toISOString(),
              });

            await supabase.from("stock_movements").insert({
              branch_id: currentBranch.id,
              product_id: item.productId,
              movement_type: "TRANSFER_OUT",
              quantity_delta: -item.quantity,
              balance_after: newStockQty,
              notes: `Transfer dispatched: ${transferNumber} to ${targetBranch?.name || targetBranchId} [Practice Mode]`,
              created_by: currentUser?.id && !currentUser.id.startsWith("usr-") ? currentUser.id : null,
              is_practice_mode: true,
            });
          } else {
            // Live transfer path: deducts from branch_stock
            const { data: stockRow } = await supabase
              .from("branch_stock")
              .select("quantity")
              .eq("branch_id", currentBranch.id)
              .eq("product_id", item.productId)
              .maybeSingle();

            const currentStockQty = stockRow?.quantity || 0;
            const newStockQty = Math.max(0, currentStockQty - item.quantity);

            if (stockRow) {
              await supabase
                .from("branch_stock")
                .update({
                  quantity: newStockQty,
                  updated_at: new Date().toISOString(),
                })
                .eq("branch_id", currentBranch.id)
                .eq("product_id", item.productId);
            }

            // Record TRANSFER_OUT movement in Supabase
            await supabase.from("stock_movements").insert({
              branch_id: currentBranch.id,
              product_id: item.productId,
              movement_type: "TRANSFER_OUT",
              quantity_delta: -item.quantity,
              balance_after: newStockQty,
              notes: `Transfer dispatched: ${transferNumber} to ${targetBranch?.name || targetBranchId}`,
              created_by:
                currentUser?.id && !currentUser.id.startsWith("usr-")
                  ? currentUser.id
                  : null,
              is_practice_mode: false,
            });
          }
        }
      }

      const newTransfer: TransferRecord = {
        id: transferId,
        transferNumber,
        sourceBranchId: currentBranch.id,
        sourceBranchName: currentBranch.name,
        targetBranchId,
        targetBranchName: targetBranch?.name || "Target Branch",
        status: "IN_TRANSIT",
        notes,
        dispatchedBy: currentUser?.id || "mgr",
        dispatchedByName: currentUser?.fullName || "Staff",
        dispatchedAt: new Date().toISOString(),
        isPracticeMode: sourceIsPractice,
        items: items.map((i) => {
          const p = products.find((pr) => pr.id === i.productId);
          return {
            productId: i.productId,
            productName: p?.name || "Product",
            sku: p?.sku || "",
            quantitySent: i.quantity,
          };
        }),
      };

      await db.put("transfers", newTransfer);

      for (const item of items) {
        const stockKey = `${currentBranch.id}_${item.productId}`;
        const existingStock = await db.get("branch_stock", stockKey);
        const p = products.find((pr) => pr.id === item.productId);
        const balanceAfter = existingStock
          ? Math.max(0, existingStock.quantity - item.quantity)
          : 0;

        if (existingStock) {
          existingStock.quantity = balanceAfter;
          existingStock.updatedAt = new Date().toISOString();
          await db.put("branch_stock", existingStock);
        }

        // Record TRANSFER_OUT in IndexedDB
        await db.put("stock_movements", {
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          branchId: currentBranch.id,
          branchName: currentBranch.name,
          productId: item.productId,
          productName: p?.name || "Product",
          movementType: "TRANSFER_OUT",
          quantityDelta: -item.quantity,
          balanceAfter,
          notes: `Transfer dispatched: ${transferNumber} to ${targetBranch?.name || targetBranchId}${sourceIsPractice ? " [Practice Mode]" : ""}`,
          createdBy: currentUser?.id,
          createdByName: currentUser?.fullName,
          createdAt: new Date().toISOString(),
          isPracticeMode: sourceIsPractice,
        });
      }

      await logAuditEvent({
        userId: currentUser?.id || "mgr",
        userName: currentUser?.fullName || "Staff",
        userRole: currentUser?.role || "inventory_manager",
        userEmail: currentUser?.email,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        actionType: "TRANSFER_DISPATCHED",
        actionTitle: `Transfer Dispatched: ${transferNumber}`,
        description: `Dispatched ${items.reduce((s, i) => s + i.quantity, 0)} units to ${targetBranch?.name || targetBranchId}${sourceIsPractice ? " [Practice Mode Sandbox]" : ""}.`,
      });

      await refreshData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to dispatch transfer." };
    }
  };

  // Confirm transfer
  const confirmTransfer = async (
    transferId: string,
    receiptItems: Array<{
      productId: string;
      quantityReceived: number;
      notes?: string;
    }>,
    discrepancyNotes?: string,
  ): Promise<{ success: boolean; hasDiscrepancy: boolean; error?: string }> => {
    if (!currentBranch)
      return { success: false, hasDiscrepancy: false, error: "No branch selected." };

    try {
      const db = await getDatabase();
      const existing = await db.get("transfers", transferId);
      if (!existing) {
        return {
          success: false,
          hasDiscrepancy: false,
          error: "Transfer not found.",
        };
      }

      // GUARDRAIL: Verify receiving branch mode matches transfer mode
      const receiverIsPractice = isPracticeMode;
      if (Boolean(existing.isPracticeMode) !== receiverIsPractice) {
        return {
          success: false,
          hasDiscrepancy: false,
          error: `Guardrail violation: Receiving branch mode (${receiverIsPractice ? "Practice" : "Live"}) does not match transfer mode (${existing.isPracticeMode ? "Practice" : "Live"}).`,
        };
      }

      let hasDiscrepancy = Boolean(discrepancyNotes);
      for (const item of receiptItems) {
        const orig = existing.items.find((i) => i.productId === item.productId);
        if (orig && orig.quantitySent !== item.quantityReceived) {
          hasDiscrepancy = true;
        }
      }

      if (isLiveSupabaseConfigured) {
        await supabase
          .from("transfers")
          .update({
            status: "RECEIVED",
            has_discrepancy: hasDiscrepancy,
            discrepancy_notes: discrepancyNotes || null,
            received_by:
              currentUser?.id && !currentUser.id.startsWith("usr-")
                ? currentUser.id
                : null,
            received_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", transferId);

        for (const item of receiptItems) {
          if (existing.isPracticeMode) {
            // Credit to practice_branch_stock without mutating live branch_stock
            const { data: pStockRow } = await supabase
              .from("practice_branch_stock")
              .select("quantity")
              .eq("branch_id", currentBranch.id)
              .eq("product_id", item.productId)
              .maybeSingle();

            let currentQty = 0;
            if (pStockRow) {
              currentQty = pStockRow.quantity;
            } else {
              const { data: liveStock } = await supabase
                .from("branch_stock")
                .select("quantity")
                .eq("branch_id", currentBranch.id)
                .eq("product_id", item.productId)
                .maybeSingle();
              currentQty = liveStock?.quantity || 0;
            }
            const newQty = currentQty + item.quantityReceived;

            await supabase
              .from("practice_branch_stock")
              .upsert({
                branch_id: currentBranch.id,
                product_id: item.productId,
                quantity: newQty,
                updated_at: new Date().toISOString(),
              });

            await supabase.from("stock_movements").insert({
              branch_id: currentBranch.id,
              product_id: item.productId,
              movement_type: "TRANSFER_IN",
              quantity_delta: item.quantityReceived,
              balance_after: newQty,
              notes: `Transfer received: ${existing.transferNumber} from ${existing.sourceBranchName} [Practice Mode]`,
              created_by:
                currentUser?.id && !currentUser.id.startsWith("usr-")
                  ? currentUser.id
                  : null,
              is_practice_mode: true,
            });
          } else {
            // Live transfer path: credits branch_stock
            const { data: stockRow } = await supabase
              .from("branch_stock")
              .select("quantity")
              .eq("branch_id", currentBranch.id)
              .eq("product_id", item.productId)
              .maybeSingle();

            const currentQty = stockRow?.quantity || 0;
            const newQty = currentQty + item.quantityReceived;

            await supabase
              .from("branch_stock")
              .upsert({
                branch_id: currentBranch.id,
                product_id: item.productId,
                quantity: newQty,
                updated_at: new Date().toISOString(),
              });

            // Record TRANSFER_IN movement in Supabase
            await supabase.from("stock_movements").insert({
              branch_id: currentBranch.id,
              product_id: item.productId,
              movement_type: "TRANSFER_IN",
              quantity_delta: item.quantityReceived,
              balance_after: newQty,
              notes: `Transfer received: ${existing.transferNumber} from ${existing.sourceBranchName}`,
              created_by:
                currentUser?.id && !currentUser.id.startsWith("usr-")
                  ? currentUser.id
                  : null,
              is_practice_mode: false,
            });
          }
        }
      }

      existing.status = "RECEIVED";
      existing.receivedBy = currentUser?.id || "mgr";
      existing.receivedByName = currentUser?.fullName || "Staff";
      existing.receivedAt = new Date().toISOString();
      existing.discrepancyNotes = discrepancyNotes;
      existing.hasDiscrepancy = hasDiscrepancy;

      for (const rItem of receiptItems) {
        const it = existing.items.find((i) => i.productId === rItem.productId);
        if (it) {
          it.quantityReceived = rItem.quantityReceived;
          it.notes = rItem.notes;
        }
      }
      await db.put("transfers", existing);

      // Upsert into target branch_stock and record TRANSFER_IN in IndexedDB
      for (const item of receiptItems) {
        const stockKey = `${currentBranch.id}_${item.productId}`;
        let existingStock = await db.get("branch_stock", stockKey);
        const prod = products.find((p) => p.id === item.productId);

        if (existingStock) {
          existingStock.quantity += item.quantityReceived;
          existingStock.updatedAt = new Date().toISOString();
          await db.put("branch_stock", existingStock);
        } else {
          // Target branch has never stocked this product before: insert new stock item record
          const defaultProd: Product = prod || {
            id: item.productId,
            sku: "SKU-" + item.productId.slice(-4),
            name: "Product " + item.productId,
            categoryId: "cat-general",
            price: 0,
            costPrice: 0,
            isActive: true,
          };
          const newStockItem: BranchStockItem = {
            id: stockKey,
            branchId: currentBranch.id,
            productId: item.productId,
            product: defaultProd,
            productName: defaultProd.name,
            sku: defaultProd.sku,
            category: defaultProd.categoryName || "General",
            quantity: item.quantityReceived,
            lowStockThreshold: 10,
            unit: defaultProd.unit || "units",
            updatedAt: new Date().toISOString(),
            isPracticeMode: existing.isPracticeMode,
          };
          await db.put("branch_stock", newStockItem);
          existingStock = newStockItem;
        }

        await db.put("stock_movements", {
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          branchId: currentBranch.id,
          branchName: currentBranch.name,
          productId: item.productId,
          productName: prod?.name || "Product",
          movementType: "TRANSFER_IN",
          quantityDelta: item.quantityReceived,
          balanceAfter: existingStock.quantity,
          notes: `Transfer received: ${existing.transferNumber} from ${existing.sourceBranchName}${existing.isPracticeMode ? " [Practice Mode]" : ""}`,
          createdBy: currentUser?.id,
          createdByName: currentUser?.fullName,
          createdAt: new Date().toISOString(),
          isPracticeMode: existing.isPracticeMode,
        });
      }

      await logAuditEvent({
        userId: currentUser?.id || "mgr",
        userName: currentUser?.fullName || "Staff",
        userRole: currentUser?.role || "inventory_manager",
        userEmail: currentUser?.email,
        branchId: currentBranch.id,
        branchName: currentBranch.name,
        actionType: "TRANSFER_RECEIVED",
        actionTitle: `Transfer Received: ${existing.transferNumber}`,
        description: `Received ${receiptItems.reduce((s, i) => s + i.quantityReceived, 0)} units from ${existing.sourceBranchName}${hasDiscrepancy ? " (Discrepancy Logged)" : ""}${existing.isPracticeMode ? " [Practice Mode Sandbox]" : ""}.`,
      });

      await refreshData();
      return { success: true, hasDiscrepancy };
    } catch (err: any) {
      return {
        success: false,
        hasDiscrepancy: false,
        error: err.message || "Failed to confirm receipt.",
      };
    }
  };

  const triggerSync = async (): Promise<{
    success: boolean;
    synced: number;
    failed: number;
  }> => {
    setIsSyncing(true);
    try {
      const db = await getDatabase();
      const queue = await db.getAll("offline_sync_queue");
      const result = await processSyncQueue(queue, async (record) => {
        if (!isPracticeMode && isLiveSupabaseConfigured) {
          const { error } = await supabase.from("transactions").insert({
            id: record.id,
            branch_id: record.order.branchId,
            cashier_id: record.order.cashierId,
            subtotal: record.order.subtotal,
            tax_amount: record.order.taxAmount,
            discount_amount: record.order.discountAmount,
            grand_total: record.order.grandTotal,
            payment_method: record.order.paymentMethod,
            amount_tendered: record.order.amountTendered,
            change_amount: record.order.changeAmount,
            notes: record.order.customerNote,
          });
          if (error) throw error;
        }
        return { success: true };
      });

      for (const item of result.updatedQueue) {
        await db.put("offline_sync_queue", item);
      }

      await refreshData();
      return {
        success: result.failedCount === 0,
        synced: result.syncedCount,
        failed: result.failedCount,
      };
    } catch {
      return { success: false, synced: 0, failed: 0 };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        isAuthLoading,
        currentUser,
        login,
        logout,
        resetPasswordForEmail,
        updateUserPassword,
        isRecoveryMode,
        setIsRecoveryMode,
        setCurrentUserRole,
        isPracticeMode,
        togglePracticeMode,
        practiceBranchIds,
        isBranchInPracticeMode,
        toggleBranchPracticeMode,
        setBranchPracticeMode,
        purgePracticeData,
        activeTab,
        setActiveTab,
        branches,
        currentBranch,
        setCurrentBranch,
        createBranch,
        updateBranch,
        deleteBranch,
        isOnline,
        toggleOnlineSimulation,
        pendingSyncCount,
        triggerSync,
        isSyncing,
        categories,
        products,
        branchStock,
        allBranchStock,
        refreshData,
        addProduct,
        updateProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        cartItems,
        discount,
        taxRate,
        cartTotals,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        applyDiscount,
        clearCart,
        processCheckout,
        adjustStock,
        stockMovements,
        transfers,
        pendingReceiptsCount,
        dispatchTransfer,
        confirmTransfer,
        transactions,
        auditLogs,
        logAuditEvent,
        incomingTransferAlert,
        clearIncomingTransferAlert,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
