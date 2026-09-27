import React from "react";
import { Transaction } from "../../types";
import { Printer, CheckCircle, X } from "lucide-react";

interface ThermalReceiptModalProps {
  transaction: Transaction | null;
  branchName: string;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  transaction,
  branchName,
  onClose,
}) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-emerald-400 mb-4">
          <CheckCircle className="w-6 h-6" />
          <h2 className="text-lg font-bold">Transaction Complete</h2>
        </div>

        {/* Thermal Printable Receipt Preview Box */}
        <div
          id="thermal-receipt-printable"
          className="bg-white text-black p-5 rounded-xl font-mono text-xs shadow-inner leading-relaxed select-text"
        >
          <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider">
              RR Multi-Branch POS
            </h3>
            <p className="text-[11px] font-semibold">{branchName}</p>
            <p className="text-[10px] text-gray-600 mt-1">
              OFFICIAL SALES RECEIPT
            </p>
            <p className="text-[10px] text-gray-500">
              {new Date(transaction.createdAt).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 font-bold">
              Tx: {transaction.transactionNumber}
            </p>
            {transaction.isOffline && (
              <span className="inline-block bg-gray-200 text-gray-800 text-[9px] px-1.5 py-0.5 rounded mt-1 font-bold">
                [STORED OFFLINE - SYNC PENDING]
              </span>
            )}
          </div>

          <div className="text-[10px] mb-2 text-gray-700">
            <span>Cashier: {transaction.cashierName || "Staff"}</span>
          </div>

          {/* Line items */}
          <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
            <div className="flex justify-between font-bold text-[10px] border-b border-gray-300 pb-1 mb-1">
              <span>ITEM</span>
              <span>QTY x PRICE</span>
              <span>TOTAL</span>
            </div>
            {transaction.items.map((item) => (
              <div
                key={item.id}
                className="py-0.5 flex justify-between text-[11px]"
              >
                <div className="flex-1 pr-2 truncate">
                  <span>{item.productName}</span>
                </div>
                <div className="text-gray-600 pr-3">
                  {item.quantity}x ₱{item.unitPrice.toFixed(2)}
                </div>
                <div className="font-semibold">₱{item.subtotal.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1 text-[11px] pt-1 border-b border-dashed border-gray-400 pb-2 mb-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{transaction.subtotal.toFixed(2)}</span>
            </div>
            {transaction.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount Applied:</span>
                <span>-₱{transaction.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>VAT / Tax (12%):</span>
              <span>₱{transaction.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black border-t border-black pt-1 mt-1">
              <span>GRAND TOTAL:</span>
              <span>₱{transaction.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 text-gray-700">
              <span className="capitalize">
                Paid via {transaction.paymentMethod}:
              </span>
              <span>₱{transaction.amountTendered.toFixed(2)}</span>
            </div>
            {transaction.changeAmount > 0 && (
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Change Due:</span>
                <span>₱{transaction.changeAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-gray-600 pt-1">
            <p>Thank you for your purchase!</p>
            <p>Please keep this receipt for returns/warranty.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 px-4 rounded-xl transition"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
};
