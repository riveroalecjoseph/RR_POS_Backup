import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { TransferDispatchModal } from "./TransferDispatchModal";
import { TransferReceiptModal } from "./TransferReceiptModal";
import { AddProductModal } from "./AddProductModal";
import { AddCategoryModal } from "./AddCategoryModal";
import { EditProductModal } from "./EditProductModal";
import { CategoryManagementModal } from "./CategoryManagementModal";
import { TransferRecord, Product } from "../../types";
import {
  Boxes,
  ArrowLeftRight,
  Sliders,
  Send,
  PackageCheck,
  History,
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Check,
  PlusCircle,
  Edit,
  Tags,
  ChevronLeft,
  ChevronRight,
  Filter,
  Store,
} from "lucide-react";

export const InventoryScreen: React.FC = () => {
  const {
    currentBranch,
    branchStock,
    transfers,
    stockMovements,
    pendingReceiptsCount,
    currentUser,
    categories,
  } = useApp();

  const [inventoryTab, setInventoryTab] = useState<
    "stock" | "incoming" | "outbound" | "audit"
  >("stock");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<
    "all" | "low" | "out" | "adequate"
  >("all");

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState<boolean>(false);
  const [isDispatchOpen, setIsDispatchOpen] = useState<boolean>(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] =
    useState<Product | undefined>(undefined);
  const [inspectingTransfer, setInspectingTransfer] =
    useState<TransferRecord | null>(null);

  // Category horizontal scroll controls for Inventory
  const invCategoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollInvLeft, setCanScrollInvLeft] = useState<boolean>(false);
  const [canScrollInvRight, setCanScrollInvRight] = useState<boolean>(false);

  const checkInvCategoryScroll = useCallback(() => {
    const el = invCategoryScrollRef.current;
    if (el) {
      setCanScrollInvLeft(el.scrollLeft > 4);
      setCanScrollInvRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkInvCategoryScroll();
    window.addEventListener("resize", checkInvCategoryScroll);
    return () => window.removeEventListener("resize", checkInvCategoryScroll);
  }, [categories, checkInvCategoryScroll]);

  const scrollInvCategories = (direction: "left" | "right") => {
    if (invCategoryScrollRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      invCategoryScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkInvCategoryScroll, 300);
    }
  };

  const isCashier = currentUser?.role === "cashier";

  // Incoming in-transit transfers for current branch
  const incomingTransfers = useMemo(() => {
    return transfers.filter(
      (t) => currentBranch && t.targetBranchId === currentBranch.id,
    );
  }, [transfers, currentBranch]);

  // Outbound transfers dispatched by current branch
  const outboundTransfers = useMemo(() => {
    return transfers.filter(
      (t) => currentBranch && t.sourceBranchId === currentBranch.id,
    );
  }, [transfers, currentBranch]);

  // Filtered branch stock with search, category filter, and stock level filter
  const filteredStock = useMemo(() => {
    return branchStock.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.product.name.toLowerCase().includes(q) ||
        item.product.sku.toLowerCase().includes(q) ||
        (item.product.categoryName &&
          item.product.categoryName.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "all" ||
        item.product.categoryId === selectedCategory;

      const isOut = item.quantity <= 0;
      const isLow =
        item.quantity > 0 &&
        item.quantity <= (item.lowStockThreshold || 10);
      const isAdequate = item.quantity > (item.lowStockThreshold || 10);

      const matchesStatus =
        stockStatusFilter === "all" ||
        (stockStatusFilter === "out" && isOut) ||
        (stockStatusFilter === "low" && isLow) ||
        (stockStatusFilter === "adequate" && isAdequate);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [branchStock, searchQuery, selectedCategory, stockStatusFilter]);

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">
              Multi-Branch Inventory &amp; Transfers
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {currentBranch?.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Two-step transfer handshake, stock movement audit trail, and
            real-time inventory
          </p>
        </div>

        {/* Action Buttons (Disabled for Cashier role per RBAC) */}
        {!isCashier && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="add-category-btn"
              onClick={() => setIsAddCategoryOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              <Tags className="w-4 h-4 text-emerald-400" />
              <span>+ Add Category</span>
            </button>

            <button
              id="add-product-btn"
              onClick={() => setIsAddProductOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add New Product</span>
            </button>

            <button
              id="manage-categories-btn"
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer active:scale-95"
            >
              <Tags className="w-4 h-4 text-slate-400" />
              <span>Categories</span>
            </button>

            <button
              id="stock-adjustment-btn"
              onClick={() => {
                setSelectedProductForAdjustment(undefined);
                setIsAdjustmentOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Stock Adjustment</span>
            </button>

            <button
              id="dispatch-transfer-btn"
              onClick={() => setIsDispatchOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-950/40 transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch Transfer</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <button
          id="tab-branch-stock"
          onClick={() => setInventoryTab("stock")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            inventoryTab === "stock"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Branch Stock ({branchStock.length})</span>
        </button>

        <button
          id="tab-incoming-transfers"
          onClick={() => setInventoryTab("incoming")}
          className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            inventoryTab === "incoming"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Incoming Handshakes</span>
          {pendingReceiptsCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
              {pendingReceiptsCount}
            </span>
          )}
        </button>

        <button
          id="tab-outbound-transfers"
          onClick={() => setInventoryTab("outbound")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            inventoryTab === "outbound"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Outbound Transfers ({outboundTransfers.length})</span>
        </button>

        <button
          id="tab-movement-audit"
          onClick={() => setInventoryTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            inventoryTab === "audit"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Movement Audit Log</span>
        </button>
      </div>

      {/* TAB 1: Branch Stock Catalog */}
      {inventoryTab === "stock" && (
        branchStock.length === 0 ? (
          <div className="max-w-2xl mx-auto my-8 sm:my-12 w-full relative">
            {/* Subtle ambient backdrop glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 rounded-3xl blur-xl opacity-60 pointer-events-none" />

            <div className="relative bg-slate-900/90 backdrop-blur-sm border border-slate-800/90 rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center shadow-2xl shadow-black/40">
              {/* Layered Icon Badge */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-950/50">
                <Boxes className="w-7 h-7" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2">
                Branch Catalog Ready — No Products Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-7 leading-relaxed">
                This branch currently has zero registered items in local storage or the database. Set up your product hierarchy to unlock stock movement audits and live POS checkout.
              </p>

              {/* 3-Step Quick Onboarding Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mb-7 text-left">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <Tags className="w-3.5 h-3.5" />
                    <span>1. Categories</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Group inventory into categories like Beverages, Snacks, or Supplies.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>2. Add Items</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Input price, cost, barcode, SKU, and initial stock quantities.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <Store className="w-3.5 h-3.5" />
                    <span>3. Start Selling</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Products instantly sync to the register for fast offline-ready checkout.
                  </p>
                </div>
              </div>

              {!isCashier && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    id="empty-add-product-btn"
                    onClick={() => setIsAddProductOpen(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-emerald-950/40 flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Add First Product</span>
                  </button>
                  <button
                    type="button"
                    id="empty-manage-categories-btn"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Tags className="w-4 h-4 text-emerald-400" />
                    <span>Manage Categories</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Search Bar & Stock Status Quick Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="stock-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter stock by name, SKU, category..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Stock Level Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Status:</span>
              </span>
              <button
                type="button"
                onClick={() => setStockStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  stockStatusFilter === "all"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("low")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  stockStatusFilter === "low"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
                }`}
              >
                Low Stock
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("out")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  stockStatusFilter === "out"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                }`}
              >
                Out of Stock
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("adequate")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  stockStatusFilter === "adequate"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                Adequate
              </button>
            </div>
          </div>

          {/* Category Filter Pills with Smooth Scrolling Controls */}
          <div className="relative flex items-center group/inv-cat">
            {canScrollInvLeft && (
              <button
                type="button"
                onClick={() => scrollInvCategories("left")}
                aria-label="Scroll inventory categories left"
                className="absolute left-0 z-10 p-1.5 rounded-full bg-slate-900/95 text-slate-200 border border-slate-700 shadow-xl hover:bg-slate-800 hover:text-emerald-400 transition -translate-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              ref={invCategoryScrollRef}
              onScroll={checkInvCategoryScroll}
              className="flex flex-nowrap overflow-x-auto scroll-smooth gap-2 py-1 px-1 w-full scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent select-none touch-pan-x"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                  selectedCategory === "all"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                }`}
              >
                <span>All Categories</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 font-mono">
                  {branchStock.length}
                </span>
              </button>
              {categories.map((cat) => {
                const count = branchStock.filter(
                  (s) => s.product.categoryId === cat.id,
                ).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/60 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
              <div className="w-6 shrink-0" aria-hidden="true" />
            </div>

            {canScrollInvRight && (
              <button
                type="button"
                onClick={() => scrollInvCategories("right")}
                aria-label="Scroll inventory categories right"
                className="absolute right-0 z-10 p-1.5 rounded-full bg-slate-900/95 text-slate-200 border border-slate-700 shadow-xl hover:bg-slate-800 hover:text-emerald-400 transition translate-x-1"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Empty filtered results notice */}
          {filteredStock.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">
                No matching products found
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing search or selecting a different category filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setStockStatusFilter("all");
                }}
                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Mobile Card List View (md:hidden) */}
          <div className="md:hidden space-y-3">
            {filteredStock.map((item) => {
              const isOut = item.quantity <= 0;
              const isLow =
                item.quantity > 0 &&
                item.quantity <= item.lowStockThreshold;

              return (
                <div
                  key={"m-" + item.id}
                  data-sku={item.product.sku}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-100 text-sm truncate product-name-cell">
                        {item.product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.product.sku}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {item.product.categoryName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isOut ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                          Adequate
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Selling
                      </div>
                      <div className="font-bold text-emerald-400 product-price-cell">
                        ₱{item.product.price.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Cost
                      </div>
                      <div className="text-slate-300">
                        ₱{item.product.costPrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Stock
                      </div>
                      <div
                        className={`font-black stock-quantity-cell ${
                          isOut
                            ? "text-red-400"
                            : isLow
                              ? "text-amber-400"
                              : "text-slate-100"
                        }`}
                      >
                        {item.quantity} units
                      </div>
                    </div>
                  </div>

                  {!isCashier && (
                    <div className="flex gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => setEditingProduct(item.product)}
                        className={`flex-1 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 edit-product-${item.product.sku}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProductForAdjustment(item.product);
                          setIsAdjustmentOpen(true);
                        }}
                        className="flex-1 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/30 transition text-center"
                      >
                        Adjust Stock
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table
                id="inventory-stock-table"
                className="w-full text-left text-xs"
              >
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Cost Price</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4">Status</th>
                    {!isCashier && (
                      <th className="py-3 px-4 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStock.map((item) => {
                    const isOut = item.quantity <= 0;
                    const isLow =
                      item.quantity > 0 &&
                      item.quantity <= item.lowStockThreshold;

                    return (
                      <tr
                        key={item.id}
                        data-sku={item.product.sku}
                        className="hover:bg-slate-850/60 transition"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100 text-sm product-name-cell">
                            {item.product.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {item.product.sku}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {item.product.categoryName}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400 product-price-cell">
                          ₱{item.product.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-slate-400 product-cost-cell">
                          ₱{item.product.costPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-sm stock-quantity-cell">
                          <span
                            className={
                              isOut
                                ? "text-red-400"
                                : isLow
                                  ? "text-amber-400"
                                  : "text-slate-100"
                            }
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                              Adequate
                            </span>
                          )}
                        </td>
                        {!isCashier && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingProduct(item.product)}
                                className={`px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-1 edit-product-${item.product.sku}`}
                                title={`Edit ${item.product.name}`}
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProductForAdjustment(item.product);
                                  setIsAdjustmentOpen(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/30 transition"
                              >
                                Adjust
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {/* TAB 2: Incoming Transfers / Handshake Step 2 */}
      {inventoryTab === "incoming" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-slate-100 mb-1">
              Incoming Inter-Branch Deliveries
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Inspect physical consignments sent to this branch. Click
              &quot;Inspect &amp; Confirm&quot; to verify quantities, record
              discrepancies, and credit items to branch stock.
            </p>

            {incomingTransfers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">
                  No incoming transfer shipments for this branch.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingTransfers.map((transfer) => {
                  const isInTransit = transfer.status === "IN_TRANSIT";
                  return (
                    <div
                      key={transfer.id}
                      data-transfer-number={transfer.transferNumber}
                      className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                        isInTransit
                          ? "bg-slate-950/80 border-amber-500/40 shadow-lg shadow-amber-950/10"
                          : "bg-slate-950/40 border-slate-800"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-100">
                            {transfer.transferNumber}
                          </span>
                          {transfer.isPracticeMode && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                              🧪 Sandbox
                            </span>
                          )}
                          {isInTransit ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 transfer-status-badge">
                              <Clock className="w-3 h-3 animate-spin" /> In
                              Transit
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 transfer-status-badge">
                              <Check className="w-3 h-3" /> Received
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400">
                          From:{" "}
                          <span className="font-semibold text-slate-200">
                            {transfer.sourceBranchName}
                          </span>{" "}
                          • Dispatched by {transfer.dispatchedByName}
                        </div>

                        <div className="text-xs text-slate-300 font-medium pt-1">
                          Items:{" "}
                          {transfer.items
                            .map(
                              (i) =>
                                `${i.productName || i.productId} (${i.quantitySent} units)`,
                            )
                            .join(", ")}
                        </div>

                        {transfer.discrepancyNotes && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400 pt-1 discrepancy-notes">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{transfer.discrepancyNotes}</span>
                          </div>
                        )}
                      </div>

                      {/* Handshake confirmation button */}
                      <div>
                        {isInTransit ? (
                          <button
                            id={`inspect-transfer-${transfer.transferNumber}`}
                            onClick={() => setInspectingTransfer(transfer)}
                            className="w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>Inspect &amp; Confirm Receipt</span>
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-400 text-right">
                            Confirmed by {transfer.receivedByName || "Manager"}
                            <div className="text-[10px] text-slate-500">
                              {transfer.receivedAt
                                ? new Date(
                                    transfer.receivedAt,
                                  ).toLocaleDateString()
                                : ""}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Outbound Transfers */}
      {inventoryTab === "outbound" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-base font-bold text-slate-100 mb-1">
            Outbound Dispatches
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Shipments dispatched from {currentBranch?.name} to other network
            branches.
          </p>

          {outboundTransfers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Send className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">
                No outbound dispatches recorded from this branch.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {outboundTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-100">
                        {transfer.transferNumber}
                      </span>
                      {transfer.isPracticeMode && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                          🧪 Sandbox
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          transfer.status === "IN_TRANSIT"
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        }`}
                      >
                        {transfer.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Destination:{" "}
                      <span className="text-slate-200 font-semibold">
                        {transfer.targetBranchName}
                      </span>{" "}
                      • Sent on{" "}
                      {new Date(transfer.dispatchedAt).toLocaleDateString()}
                    </div>

                    <div className="text-xs text-slate-300 font-medium">
                      Items:{" "}
                      {transfer.items
                        .map(
                          (i) =>
                            `${i.productName || i.productId} (${i.quantitySent} units)`,
                        )
                        .join(", ")}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500">
                    {transfer.status === "RECEIVED" ? (
                      <span className="text-emerald-400 font-medium">
                        Receipt Confirmed
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">
                        Awaiting Receiver Confirmation
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Movement Audit Log */}
      {inventoryTab === "audit" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-slate-100">
              Immutable Stock Movement Audit Trail
            </h2>
            <p className="text-xs text-slate-400">
              Complete historical ledger tracking Sales, Restocks, Spoilage,
              Transfers, and Promotions
            </p>
          </div>

          <div className="overflow-x-auto">
            <table id="audit-log-table" className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-center">Delta</th>
                  <th className="py-3 px-4 text-center">Balance After</th>
                  <th className="py-3 px-4">Notes / Ref</th>
                  <th className="py-3 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stockMovements
                  .filter(
                    (m) => currentBranch && m.branchId === currentBranch.id,
                  )
                  .map((m) => {
                    const isPositive = m.quantityDelta > 0;
                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-slate-850/60 transition"
                      >
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.movementType === "Sale"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : m.movementType === "Restock"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : m.movementType === "Waste/Spoilage"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : m.movementType === "Gift/Promo"
                                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {m.movementType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {m.productName}
                        </td>
                        <td
                          className={`py-3 px-4 text-center font-bold ${
                            isPositive ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-100">
                          {m.balanceAfter}
                        </td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                          {m.notes || m.referenceId || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {m.createdByName || "Staff"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <AddProductModal onClose={() => setIsAddProductOpen(false)} />
      )}

      {/* Manage Categories Modal */}
      {isCategoryModalOpen && (
        <CategoryManagementModal
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <AddCategoryModal onClose={() => setIsAddCategoryOpen(false)} />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustmentOpen && (
        <StockAdjustmentModal
          preselectedProduct={selectedProductForAdjustment}
          onClose={() => {
            setIsAdjustmentOpen(false);
            setSelectedProductForAdjustment(undefined);
          }}
        />
      )}

      {/* Dispatch Transfer Modal (Step 1) */}
      {isDispatchOpen && (
        <TransferDispatchModal onClose={() => setIsDispatchOpen(false)} />
      )}

      {/* Transfer Receipt Modal (Step 2) */}
      {inspectingTransfer && (
        <TransferReceiptModal
          transfer={inspectingTransfer}
          onClose={() => setInspectingTransfer(null)}
        />
      )}
    </div>
  );
};
