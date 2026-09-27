import React, { useState } from "react";
import { Discount, DiscountType } from "../../core/pos/cartCalculations";
import { X, Percent, Tag } from "lucide-react";

interface DiscountModalProps {
  currentDiscount?: Discount;
  subtotal: number;
  onApply: (discount?: Discount) => void;
  onClose: () => void;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({
  currentDiscount,
  onApply,
  onClose,
}) => {
  const [discountType, setDiscountType] = useState<DiscountType>(
    currentDiscount?.type || "percentage",
  );
  const [value, setValue] = useState<string>(
    currentDiscount ? currentDiscount.value.toString() : "10",
  );

  const presets = [
    { label: "5% Off", type: "percentage" as DiscountType, val: 5 },
    { label: "10% Regular", type: "percentage" as DiscountType, val: 10 },
    { label: "15% Promo", type: "percentage" as DiscountType, val: 15 },
    { label: "20% Senior / PWD", type: "percentage" as DiscountType, val: 20 },
    { label: "₱50 Voucher", type: "fixed" as DiscountType, val: 50 },
    { label: "₱100 Voucher", type: "fixed" as DiscountType, val: 100 },
  ];

  const handleApply = () => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      onApply(undefined);
    } else {
      onApply({
        type: discountType,
        value: numericValue,
      });
    }
    onClose();
  };

  const handleRemove = () => {
    onApply(undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-emerald-400 mb-4">
          <Tag className="w-5 h-5" />
          <h2 className="text-lg font-bold">Apply Discount</h2>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setDiscountType(preset.type);
                setValue(preset.val.toString());
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 transition text-left"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl bg-slate-950 p-1 mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => setDiscountType("percentage")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              discountType === "percentage"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Percentage (%)
          </button>
          <button
            type="button"
            onClick={() => setDiscountType("fixed")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              discountType === "fixed"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>₱</span>
            Fixed Amount (₱)
          </button>
        </div>

        {/* Custom Input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            {discountType === "percentage"
              ? "Discount Percentage (%)"
              : "Discount Amount (₱)"}
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div className="flex gap-2">
          {currentDiscount && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-4 py-2 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition active:scale-95"
          >
            Apply Discount
          </button>
        </div>
      </div>
    </div>
  );
};
