import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { TransferRecord } from "../../types";
import { X, PackageCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TransferReceiptModalProps {
  transfer: TransferRecord;
  onClose: () => void;
}

export const TransferReceiptModal: React.FC<TransferReceiptModalProps> = ({
  transfer,
  onClose,
}) => {
  const { confirmTransfer, currentBranch } = useApp();

  const [receiptItems, setReceiptItems] = useState(
    transfer.items.map((item) => ({
      productId: item.productId,
      productName: item.productName || item.sku || item.productId,
      quantitySent: item.quantitySent,
      quantityReceived: item.quantitySent, // Default to full delivery
      notes: "",
    })),
  );

  const [discrepancyNotes, setDiscrepancyNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAnyDiscrepancy = receiptItems.some(
    (item) => item.quantityReceived !== item.quantitySent,
  );

  const handleUpdateQuantity = (productId: string, qty: number) => {
    setReceiptItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantityReceived: Math.max(0, qty) }
          : item,
      ),
    );
  };

  const handleUpdateItemNotes = (productId: string, notes: string) => {
    setReceiptItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, notes } : item,
      ),
    );
  };

  const handleConfirm = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const payload = receiptItems.map((item) => ({
      productId: item.productId,
      quantityReceived: item.quantityReceived,
      notes: item.notes,
    }));

    const result = await confirmTransfer(
      transfer.id,
      payload,
      discrepancyNotes,
    );
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || "Failed to confirm receipt.");
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

        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5 text-emerald-400">
            <PackageCheck className="w-6 h-6" />
            <h2 className="text-lg font-bold">
              Step 2: Inspect &amp; Confirm Receipt
            </h2>
          </div>
          {transfer.isPracticeMode ? (
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/15 px-2.5 py-1 rounded-full border border-purple-500/30">
              🧪 Sandbox Transfer
            </span>
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
              🟢 Live Transfer
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Transfer{" "}
          <span className="font-mono font-semibold text-slate-200">
            {transfer.transferNumber}
          </span>{" "}
          from{" "}
          <span className="font-semibold text-emerald-400">
            {transfer.sourceBranchName}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-200">
            {currentBranch?.name}
          </span>
          {transfer.isPracticeMode ? " (Crediting Sandbox Inventory)" : " (Crediting Live Inventory)"}.
        </p>

        {/* Transfer manifest card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-4 text-xs space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>Dispatched By:</span>
            <span className="text-slate-200">
              {transfer.dispatchedByName || "Sender Branch Manager"}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Dispatched At:</span>
            <span className="text-slate-200">
              {new Date(transfer.dispatchedAt).toLocaleString()}
            </span>
          </div>
          {transfer.notes && (
            <div className="pt-1 border-t border-slate-800/80 text-slate-300 italic">
              &quot;{transfer.notes}&quot;
            </div>
          )}
        </div>

        {/* Item verification table */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2">
            <span>Item</span>
            <span>Sent vs Received</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {receiptItems.map((item) => {
              const isShortage = item.quantityReceived < item.quantitySent;
              return (
                <div
                  key={item.productId}
                  className={`p-3 rounded-xl border transition ${
                    isShortage
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">
                      {item.productName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        Sent:{" "}
                        <span className="font-bold text-slate-200">
                          {item.quantitySent}
                        </span>
                      </span>
                      <span className="text-slate-600">→</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">Recv:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantitySent}
                          value={item.quantityReceived}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              item.productId,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-center text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {isShortage && (
                    <input
                      type="text"
                      placeholder="Note discrepancy reason (e.g. 2 cans damaged / leaking in transit)"
                      value={item.notes}
                      onChange={(e) =>
                        handleUpdateItemNotes(item.productId, e.target.value)
                      }
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-[11px] text-amber-200 placeholder-slate-500 focus:outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Discrepancy warning banner */}
        {hasAnyDiscrepancy && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 mb-4 flex items-start gap-2 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Discrepancy Detected:</span> Only
              verified intact items will be credited to {currentBranch?.name}{" "}
              stock. Discrepancy details will be logged in the transfer audit
              record.
            </div>
          </div>
        )}

        {/* Discrepancy Notes */}
        {hasAnyDiscrepancy && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              General Inspection / Incident Notes
            </label>
            <input
              type="text"
              value={discrepancyNotes}
              onChange={(e) => setDiscrepancyNotes(e.target.value)}
              placeholder="e.g. Delivery box was crushed on arrival; driver acknowledged damage"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        )}

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting ? "Confirming..." : "Confirm & Credit Stock"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
