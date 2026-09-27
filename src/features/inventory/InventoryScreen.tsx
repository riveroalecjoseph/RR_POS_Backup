import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { AddProductModal } from "./AddProductModal";
import { AddCategoryModal } from "./AddCategoryModal";
import { EditProductModal } from "./EditProductModal";
import { CategoryManagementModal } from "./CategoryManagementModal";
import { Product } from "../../types";
import {
  Boxes,
  Sliders,
  AlertTriangle,
  Search,
  PlusCircle,
  Edit,
  Tags,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react";

export const InventoryScreen: React.FC = () => {
  const {
    currentBranch,
    branchStock,
    currentUser,
    categories,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<
    "all" | "low" | "out" | "adequate"
  >("all");

  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState<boolean>(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] =
    useState<Product | undefined>(undefined);

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

  // Filtered branch stock with search, category filter, and stock level filter
  const filteredStock = useMemo(() => {
    return branchStock.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.product.name.toLowerCase().includes(q) ||
        item.product.sku.toLowerCase().includes(q) ||
        (item.product.categoryName &&
          item.product.categoryName.toLowerCase().includes(q)) ||
        (item.product.barcode && item.product.barcode.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "all" ||
        item.product.categoryId === selectedCategory;

      const isLow =
        item.quantity > 0 && item.quantity <= item.lowStockThreshold;
      const isOut = item.quantity === 0;
      const isAdequate = item.quantity > item.lowStockThreshold;

      let matchesStockFilter = true;
      if (stockStatusFilter === "low") matchesStockFilter = isLow;
      if (stockStatusFilter === "out") matchesStockFilter = isOut;
      if (stockStatusFilter === "adequate") matchesStockFilter = isAdequate;

      return matchesSearch && matchesCategory && matchesStockFilter;
    });
  }, [branchStock, searchQuery, selectedCategory, stockStatusFilter]);

  const lowStockCount = useMemo(
    () =>
      branchStock.filter(
        (i) => i.quantity > 0 && i.quantity <= i.lowStockThreshold,
      ).length,
    [branchStock],
  );

  const outOfStockCount = useMemo(
    () => branchStock.filter((i) => i.quantity === 0).length,
    [branchStock],
  );

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-400" />
            <span>Branch Inventory &amp; Stock Levels</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time inventory levels for <strong className="text-emerald-400">{currentBranch?.name || "Current Store"}</strong>. Create products, categories, and adjust balances.
          </p>
        </div>

        {!isCashier && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="inv-add-category-btn"
              type="button"
              onClick={() => setIsAddCategoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 transition cursor-pointer"
            >
              <Tags className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Category</span>
            </button>

            <button
              id="inv-manage-categories-btn"
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 transition cursor-pointer"
            >
              <span>Manage Categories</span>
            </button>

            <button
              id="inv-add-product-btn"
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Product</span>
            </button>
          </div>
        )}
      </div>

      {branchStock.length === 0 ? (
        <div className="max-w-2xl mx-auto my-8 sm:my-12 w-full relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 rounded-3xl blur-xl opacity-60 pointer-events-none" />

          <div className="relative bg-slate-900/90 backdrop-blur-sm border border-slate-800/90 rounded-3xl p-6 sm:p-10 text-center flex flex-col items-center shadow-2xl shadow-black/40">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-950/50">
              <Boxes className="w-7 h-7" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2">
              Branch Catalog Ready — No Products Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mb-7 leading-relaxed">
              This branch currently has zero registered items in local storage or the database. Set up your product hierarchy to unlock stock movement audits and live POS checkout.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mb-7 text-left">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <Tags className="w-3.5 h-3.5" />
                  <span>1. Categories</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Group inventory into categories with custom display order.
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
                  Products instantly sync to POS for quick, touch-friendly checkout.
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
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by SKU, name, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setStockStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  stockStatusFilter === "all"
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All ({branchStock.length})
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("low")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  stockStatusFilter === "low"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Low Stock ({lowStockCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStockStatusFilter("out")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  stockStatusFilter === "out"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Out of Stock ({outOfStockCount})
              </button>
            </div>
          </div>

          {/* Category Horizontal Scroll Pills */}
          <div className="relative flex items-center group">
            {canScrollInvLeft && (
              <button
                type="button"
                onClick={() => scrollInvCategories("left")}
                className="absolute left-0 z-10 w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700 text-white flex items-center justify-center shadow-lg transition hover:bg-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              ref={invCategoryScrollRef}
              onScroll={checkInvCategoryScroll}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 w-full px-1"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                All Categories
              </button>

              {categories
                .sort((a, b) => (a.displayOrder ?? a.display_order ?? 0) - (b.displayOrder ?? b.display_order ?? 0))
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color || "#10b981" }}
                    />
                    <span>{cat.name}</span>
                  </button>
                ))}
            </div>

            {canScrollInvRight && (
              <button
                type="button"
                onClick={() => scrollInvCategories("right")}
                className="absolute right-0 z-10 w-7 h-7 rounded-full bg-slate-800/90 border border-slate-700 text-white flex items-center justify-center shadow-lg transition hover:bg-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Branch Stock Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Item Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">In Stock</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {!isCashier && (
                      <th className="py-3 px-4 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No products match the selected filters or search terms.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.map((item) => {
                      const isLow =
                        item.quantity > 0 &&
                        item.quantity <= item.lowStockThreshold;
                      const isOut = item.quantity === 0;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                              <span>SKU: {item.product.sku}</span>
                              {item.product.barcode && (
                                <span>• Barcode: {item.product.barcode}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/60">
                              {item.product.categoryName || "General"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                            ₱{item.product.price.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            ₱{(item.product.costPrice || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                            <span
                              className={
                                isOut
                                  ? "text-red-400"
                                  : isLow
                                    ? "text-amber-400"
                                    : "text-white"
                              }
                            >
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isOut
                                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                  : isLow
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {isOut
                                ? "Out of Stock"
                                : isLow
                                  ? "Low Stock"
                                  : "Adequate"}
                            </span>
                          </td>
                          {!isCashier && (
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProductForAdjustment(item.product);
                                    setIsAdjustmentOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[11px] font-semibold flex items-center gap-1"
                                  title="Adjust Stock Balance"
                                >
                                  <Sliders className="w-3 h-3 text-emerald-400" />
                                  <span>Adjust</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct(item.product)}
                                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                                  title="Edit Product Details"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <AddProductModal onClose={() => setIsAddProductOpen(false)} />
      )}

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <AddCategoryModal onClose={() => setIsAddCategoryOpen(false)} />
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <CategoryManagementModal
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
};
