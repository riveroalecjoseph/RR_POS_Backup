import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Product } from "../../types";
import { X, Edit3, AlertCircle, CheckCircle2 } from "lucide-react";
import { CategoryManagementModal } from "./CategoryManagementModal";

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
}) => {
  const { categories, updateProduct } = useApp();

  const [name, setName] = useState<string>(product.name);
  const [description, setDescription] = useState<string>(
    product.description || "",
  );
  const [categoryId, setCategoryId] = useState<string>(product.categoryId);
  const [costPrice, setCostPrice] = useState<number>(product.costPrice);
  const [sellingPrice, setSellingPrice] = useState<number>(product.price);
  const [barcode, setBarcode] = useState<string>(product.barcode || "");

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Product name is required.");
      return;
    }
    if (sellingPrice < 0 || costPrice < 0) {
      setErrorMessage("Prices cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    const result = await updateProduct(product.id, {
      name: name.trim(),
      description: description.trim(),
      categoryId,
      costPrice,
      price: sellingPrice,
      barcode: barcode.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || "Failed to update product.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
          <Edit3 className="w-6 h-6" />
          <h2 className="text-lg font-bold">Edit Product: {product.sku}</h2>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Modifications will instantly update the Inventory table and POS cash
          register
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              id="edit-product-name-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
                  title="Add, edit, or delete categories"
                >
                  Manage
                </button>
              </div>
              <select
                id="edit-product-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Barcode
              </label>
              <input
                type="text"
                id="edit-product-barcode-input"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cost Price (₱) *
              </label>
              <input
                type="number"
                id="edit-product-cost-input"
                step="any"
                min="0"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Selling Price (₱) *
              </label>
              <input
                type="number"
                id="edit-product-price-input"
                step="any"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) =>
                  setSellingPrice(parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="edit-product-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-edit-product-btn"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>

      {isCategoryModalOpen && (
        <CategoryManagementModal onClose={() => setIsCategoryModalOpen(false)} />
      )}
    </div>
  );
};
