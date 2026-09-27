import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { Transaction } from "../../types";
import { PaymentModal } from "./PaymentModal";
import { DiscountModal } from "./DiscountModal";
import { ThermalReceiptModal } from "./ThermalReceiptModal";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  CreditCard,
  AlertCircle,
  PackageX,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
} from "lucide-react";

export const POSScreen: React.FC = () => {
  const {
    products,
    categories,
    branchStock,
    currentBranch,
    cartItems,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    discount,
    applyDiscount,
    cartTotals,
    currentUser,
    setActiveTab,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] =
    useState<Transaction | null>(null);

  // Category horizontal scroll controls
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

  const checkCategoryScroll = useCallback(() => {
    const el = categoryScrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    window.addEventListener("resize", checkCategoryScroll);
    return () => window.removeEventListener("resize", checkCategoryScroll);
  }, [categories, checkCategoryScroll]);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      categoryScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkCategoryScroll, 300);
    }
  };

  // Map stock by product ID for active branch
  const stockByProductId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of branchStock) {
      map[item.productId] = item.quantity;
    }
    return map;
  }, [branchStock]);

  // Filter products by category & search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" || p.categoryId === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 flex-1 flex flex-col min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Catalog & Search (independent scrolling on md: 7 or 8 cols) */}
        <div className="md:col-span-7 xl:col-span-8 flex flex-col gap-3.5 min-h-0 flex-1 md:overflow-y-auto md:pr-2 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Top Bar: Search & Category Pills */}
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, SKU, or barcode..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Category Horizontal Pills with Smooth Scrolling & Controls */}
          {categories.length > 0 && (
            <div className="relative flex items-center group/categories shrink-0">
              {/* Scroll Left Button */}
              {canScrollLeft && (
                <button
                  type="button"
                  id="pos-scroll-left-btn"
                  onClick={() => scrollCategories("left")}
                  aria-label="Scroll categories left"
                  className="absolute left-0 z-10 p-1.5 rounded-full bg-slate-900/95 text-slate-200 border border-slate-700 shadow-xl hover:bg-slate-800 hover:text-emerald-400 transition -translate-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* Scrollable Pills Row */}
              <div
                ref={categoryScrollRef}
                onScroll={checkCategoryScroll}
                className="flex flex-nowrap overflow-x-auto scroll-smooth gap-2 py-1 px-1 w-full scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent select-none touch-pan-x"
              >
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                    selectedCategory === "all"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  All Items ({products.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      selectedCategory === cat.id
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
                {/* Edge spacer */}
                <div className="w-6 shrink-0" aria-hidden="true" />
              </div>

              {/* Scroll Right Button */}
              {canScrollRight && (
                <button
                  type="button"
                  id="pos-scroll-right-btn"
                  onClick={() => scrollCategories("right")}
                  aria-label="Scroll categories right"
                  className="absolute right-0 z-10 p-1.5 rounded-full bg-slate-900/95 text-slate-200 border border-slate-700 shadow-xl hover:bg-slate-800 hover:text-emerald-400 transition translate-x-1"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Clean Slate Empty State or Product Grid */}
          {products.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-slate-900/50 border border-slate-800/80 rounded-3xl h-full shadow-xl relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-950/30">
                <PackageX className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100 mb-2">
                Register Ready — No Products Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                Your catalog is clean. Add inventory categories and items in Inventory Management to begin ringing up sales.
              </p>
              {currentUser?.role !== "cashier" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("inventory")}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Open Inventory &amp; Add Products</span>
                </button>
              )}

              {/* 3-Step Quick Start Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-8 pt-6 border-t border-slate-800/60 text-left">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Step 1</div>
                  <div className="text-xs font-semibold text-slate-200">Create Categories</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Organize store shelves</div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1">Step 2</div>
                  <div className="text-xs font-semibold text-slate-200">Add Items &amp; Stock</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Set prices, SKU, barcodes</div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Step 3</div>
                  <div className="text-xs font-semibold text-slate-200">Ring Up Sales</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Offline-first POS checkout</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const currentStock = stockByProductId[product.id] ?? 0;
                  const isOutOfStock = currentStock <= 0;
                  const isLowStock = currentStock > 0 && currentStock <= 15;

                  return (
                    <div
                      key={product.id}
                      data-product-sku={product.sku}
                      data-product-name={product.name}
                      onClick={() => {
                        if (!isOutOfStock) {
                          addToCart(product);
                        }
                      }}
                      className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border transition text-left select-none min-h-[160px] ${
                        isOutOfStock
                          ? "bg-slate-900/40 border-slate-800/50 opacity-60 cursor-not-allowed"
                          : "bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-emerald-500/50 cursor-pointer shadow-md hover:shadow-emerald-950/20 active:scale-[0.98]"
                      }`}
                    >
                      <div className="flex-1 flex flex-col">
                        {/* Stock badge & SKU */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded truncate max-w-[65px] sm:max-w-[80px]">
                            {product.sku}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 flex items-center gap-0.5 shrink-0">
                              <PackageX className="w-2.5 h-2.5" /> Out
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                              Low: {currentStock}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                              {currentStock} in stock
                            </span>
                          )}
                        </div>

                        <h3 className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition line-clamp-2 mb-1">
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                          {product.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-auto">
                        <span className="text-sm sm:text-base font-extrabold text-emerald-400 tracking-tight">
                          ₱{product.price.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          aria-label={`Add ${product.name} to cart`}
                          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition ${
                            isOutOfStock
                              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                              : "bg-emerald-600 group-hover:bg-emerald-500 text-white shadow-sm active:scale-95 cursor-pointer"
                          }`}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No products found matching your search.</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-3 text-xs text-emerald-400 hover:underline"
                  >
                    Reset search filter
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Column: Docked Order Cart & Tender Summary (5 cols on md, 4 on xl) */}
        <div className="md:col-span-5 xl:col-span-4 flex flex-col flex-1 min-h-0">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col flex-1 h-full min-h-0">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-base text-slate-100">
                  Current Order
                </h2>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/20">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  items
                </span>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-red-400 transition"
                  title="Clear entire cart"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items Scroll Area */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 mb-3 scrollbar-thin scrollbar-thumb-slate-800">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30 stroke-1" />
                  <p className="text-sm font-medium">Cart is empty</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click items on the left to ring up sales
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {item.name}
                      </h4>
                      <div className="text-[11px] text-emerald-400 font-medium">
                        ₱{item.unitPrice.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quantity decrement */}
                      <button
                        onClick={() =>
                          updateCartQuantity(item.productId, item.quantity - 1)
                        }
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="text-xs font-bold text-slate-100 min-w-[20px] text-center">
                        {item.quantity}
                      </span>

                      {/* Quantity increment */}
                      <button
                        onClick={() =>
                          updateCartQuantity(item.productId, item.quantity + 1)
                        }
                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {/* Remove item */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="w-6 h-6 rounded-md text-slate-500 hover:text-red-400 flex items-center justify-center transition ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Summary & Settlement */}
            <div className="border-t border-slate-800 pt-3 space-y-2 shrink-0">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-200">
                  ₱{cartTotals.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Discount Row & Trigger */}
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsDiscountOpen(true)}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>
                    {discount
                      ? discount.type === "percentage"
                        ? `Discount (${discount.value}%)`
                        : `Discount (₱${discount.value})`
                      : "Add Discount"}
                  </span>
                </button>
                <span className="font-semibold text-emerald-400">
                  {cartTotals.discountAmount > 0
                    ? `-₱${cartTotals.discountAmount.toFixed(2)}`
                    : "₱0.00"}
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>VAT / Sales Tax (12%)</span>
                <span className="font-semibold text-slate-200">
                  ₱{cartTotals.taxAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-slate-100 border-t border-slate-800 pt-2">
                <span>Grand Total</span>
                <span className="text-emerald-400 text-lg">
                  ₱{cartTotals.grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Settle / Pay Button */}
              <button
                type="button"
                onClick={() => setIsPaymentOpen(true)}
                disabled={cartItems.length === 0}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition active:scale-95 mt-2 ${
                  cartItems.length === 0
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay ₱{cartTotals.grandTotal.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Settlement Modal */}
      {isPaymentOpen && (
        <PaymentModal
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={(tx) => {
            setIsPaymentOpen(false);
            setCompletedTransaction(tx);
          }}
        />
      )}

      {/* Discount Configuration Modal */}
      {isDiscountOpen && (
        <DiscountModal
          currentDiscount={discount}
          subtotal={cartTotals.subtotal}
          onApply={applyDiscount}
          onClose={() => setIsDiscountOpen(false)}
        />
      )}

      {/* Thermal Receipt Print Modal */}
      {completedTransaction && (
        <ThermalReceiptModal
          transaction={completedTransaction}
          branchName={currentBranch?.name || "Central Store"}
          onClose={() => setCompletedTransaction(null)}
        />
      )}
    </div>
  );
};
