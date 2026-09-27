import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Transaction } from "../../types";
import {
  X,
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  RotateCcw,
} from "lucide-react";

interface PaymentModalProps {
  onSuccess: (transaction: Transaction) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  onSuccess,
  onClose,
}) => {
  const { cartTotals, processCheckout, isOnline } = useApp();
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "e_wallet"
  >("cash");
  const [amountTendered, setAmountTendered] = useState<number>(
    cartTotals.grandTotal,
  );
  const [tenderHistory, setTenderHistory] = useState<number[]>([
    cartTotals.grandTotal,
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const grandTotal = cartTotals.grandTotal;
  const changeAmount = Math.max(0, amountTendered - grandTotal);
  const isCashSufficient = amountTendered >= grandTotal;

  // Quick cash additions and deductions
  const handleAddCash = (increment: number) => {
    setAmountTendered((prev) => {
      const next = Math.round((prev + increment) * 100) / 100;
      setTenderHistory((h) => [...h, next]);
      return next;
    });
  };

  const handleDeductCash = (decrement: number) => {
    setAmountTendered((prev) => {
      const next = Math.max(0, Math.round((prev - decrement) * 100) / 100);
      setTenderHistory((h) => [...h, next]);
      return next;
    });
  };

  const handleSetExact = () => {
    setAmountTendered(grandTotal);
    setTenderHistory((h) => [...h, grandTotal]);
  };

  const handleClear = () => {
    setAmountTendered(0);
    setTenderHistory((h) => [...h, 0]);
  };

  const handleUndo = () => {
    if (tenderHistory.length > 1) {
      const nextHistory = [...tenderHistory];
      nextHistory.pop();
      const prev = nextHistory[nextHistory.length - 1];
      setTenderHistory(nextHistory);
      setAmountTendered(prev);
    } else {
      setAmountTendered(grandTotal);
    }
  };

  const handleSettle = async () => {
    setErrorMessage(null);
    if (paymentMethod === "cash" && !isCashSufficient) {
      setErrorMessage(
        `Insufficient cash tendered. Total is ₱${grandTotal.toFixed(2)}.`,
      );
      return;
    }

    setIsProcessing(true);
    const result = await processCheckout(paymentMethod, amountTendered);
    setIsProcessing(false);

    if (result.success && result.transaction) {
      onSuccess(result.transaction);
    } else {
      setErrorMessage(result.error || "Failed to complete transaction.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <span>Checkout &amp; Settlement</span>
          {!isOnline && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <WifiOff className="w-3 h-3" /> Offline Mode
            </span>
          )}
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Choose a payment method and record settlement.
        </p>

        {/* Total Display Banner */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Grand Total Due
            </span>
            <div className="text-3xl font-black text-emerald-400">
              ₱{grandTotal.toFixed(2)}
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 space-y-0.5">
            <div>Subtotal: ₱{cartTotals.subtotal.toFixed(2)}</div>
            {cartTotals.discountAmount > 0 && (
              <div className="text-emerald-400 font-medium">
                Discount: -₱{cartTotals.discountAmount.toFixed(2)}
              </div>
            )}
            <div>Tax (12%): ₱{cartTotals.taxAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <button
            type="button"
            onClick={() => {
              setPaymentMethod("cash");
              setAmountTendered(grandTotal);
            }}
            className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border font-semibold text-xs transition ${
              paymentMethod === "cash"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50"
                : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Banknote className="w-6 h-6" />
            <span>Cash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaymentMethod("e_wallet");
              setAmountTendered(grandTotal);
            }}
            className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border font-semibold text-xs transition ${
              paymentMethod === "e_wallet"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50"
                : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <QrCode className="w-6 h-6" />
            <span>GCash / Maya</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPaymentMethod("card");
              setAmountTendered(grandTotal);
            }}
            className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl border font-semibold text-xs transition ${
              paymentMethod === "card"
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50"
                : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <CreditCard className="w-6 h-6" />
            <span>Debit / Credit</span>
          </button>
        </div>

        {/* Cash Tender Section */}
        {paymentMethod === "cash" && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400">
                Amount Tendered (₱)
              </label>
              <div className="flex items-center gap-2.5 text-xs">
                {tenderHistory.length > 1 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold transition cursor-pointer"
                    title="Undo last addition or deduction"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Undo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-rose-400 font-semibold transition cursor-pointer"
                  title="Clear amount to 0"
                >
                  Clear (₱0)
                </button>
                <button
                  type="button"
                  onClick={handleSetExact}
                  className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold cursor-pointer"
                  title="Reset to exact grand total"
                >
                  Exact (₱{grandTotal.toFixed(2)})
                </button>
              </div>
            </div>

            <div className="relative mb-3">
              <input
                type="number"
                step="any"
                value={amountTendered}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmountTendered(val);
                  setTenderHistory((h) => [...h, val]);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xl font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                placeholder="0.00"
              />
            </div>

            {/* Quick cash additions and deductions */}
            <div className="space-y-2 mb-3">
              {/* Quick Add Row */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center justify-between">
                  <span>+ Quick Add Cash:</span>
                  <span className="text-[10px] font-normal text-slate-500">Tap to add bill</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 200, 500, 1000].map((denomination) => (
                    <button
                      key={"add-" + denomination}
                      type="button"
                      onClick={() => handleAddCash(denomination)}
                      className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/30 transition active:scale-95 cursor-pointer text-center"
                    >
                      +₱{denomination}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Deduct Row */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center justify-between">
                  <span>− Quick Deduct Cash:</span>
                  <span className="text-[10px] font-normal text-slate-500">Tap if clicked extra</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 200, 500, 1000].map((denomination) => (
                    <button
                      key={"deduct-" + denomination}
                      type="button"
                      onClick={() => handleDeductCash(denomination)}
                      className="py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-xs font-bold border border-rose-500/30 transition active:scale-95 cursor-pointer text-center"
                    >
                      −₱{denomination}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Change calculation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm">
              <span className="text-slate-400 font-medium">
                {isCashSufficient ? "Change Due:" : "Shortage (Remaining Due):"}
              </span>
              <span
                className={`font-black text-base ${
                  isCashSufficient ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isCashSufficient
                  ? `₱${changeAmount.toFixed(2)}`
                  : `−₱${(grandTotal - amountTendered).toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        {/* E-Wallet / Card Confirmation Notice */}
        {paymentMethod !== "cash" && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-5 text-center">
            <div className="text-xs text-slate-300 font-medium mb-1">
              Ready to process{" "}
              {paymentMethod === "e_wallet"
                ? "QR Code Scan"
                : "POS Terminal Card Swipe"}
            </div>
            <div className="text-xs text-slate-500">
              Amount to authorize:{" "}
              <span className="font-bold text-slate-200">
                ₱{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Error message if any */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Settle Action Button */}
        <button
          type="button"
          onClick={handleSettle}
          disabled={
            isProcessing || (paymentMethod === "cash" && !isCashSufficient)
          }
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-95 ${
            isProcessing || (paymentMethod === "cash" && !isCashSufficient)
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer"
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>
            {isProcessing
              ? "Processing Order..."
              : `Complete Order (₱${grandTotal.toFixed(2)})`}
          </span>
        </button>
      </div>
    </div>
  );
};
