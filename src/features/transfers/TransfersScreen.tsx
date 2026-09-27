import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { TransferDispatchModal } from "../inventory/TransferDispatchModal";
import { TransferReceiptModal } from "../inventory/TransferReceiptModal";
import { TransferRecord } from "../../types";
import {
  ArrowLeftRight,
  Send,
  PackageCheck,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";

export const TransfersScreen: React.FC = () => {
  const {
    currentBranch,
    transfers,
    pendingReceiptsCount,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<"incoming" | "outbound" | "all">(
    "incoming",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDispatchOpen, setIsDispatchOpen] = useState<boolean>(false);
  const [inspectingTransfer, setInspectingTransfer] =
    useState<TransferRecord | null>(null);

  // Incoming transfers destined for the active branch
  const incomingTransfers = useMemo(() => {
    return transfers.filter(
      (t) => currentBranch && t.targetBranchId === currentBranch.id,
    );
  }, [transfers, currentBranch]);

  // Outbound transfers originating from the active branch
  const outboundTransfers = useMemo(() => {
    return transfers.filter(
      (t) => currentBranch && t.sourceBranchId === currentBranch.id,
    );
  }, [transfers, currentBranch]);

  // Active list based on subTab
  const currentList = useMemo(() => {
    let list: TransferRecord[] = [];
    if (activeSubTab === "incoming") {
      list = incomingTransfers;
    } else if (activeSubTab === "outbound") {
      list = outboundTransfers;
    } else {
      list = transfers;
    }

    return list.filter((t) => {
      // Filter by status
      if (statusFilter !== "all" && t.status !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = t.transferNumber?.toLowerCase().includes(q);
        const matchesSource = (t.sourceBranchName || "").toLowerCase().includes(q);
        const matchesTarget = (t.targetBranchName || "").toLowerCase().includes(q);
        const matchesNotes = (t.notes || "").toLowerCase().includes(q);
        const matchesDiscrepancy = (t.discrepancyNotes || "").toLowerCase().includes(q);
        const matchesItem = t.items?.some((i) =>
          (i.productName || i.sku || "").toLowerCase().includes(q),
        );
        if (!matchesNum && !matchesSource && !matchesTarget && !matchesNotes && !matchesDiscrepancy && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [activeSubTab, incomingTransfers, outboundTransfers, transfers, statusFilter, searchQuery]);

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-emerald-400" />
            <span>Inter-Branch Handshake &amp; Transfers</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Two-stage chain of custody protocol: <strong className="text-slate-300">Dispatch</strong> (deducts source stock) → <strong className="text-slate-300">In Transit</strong> → <strong className="text-slate-300">Confirm Receipt</strong> (physical count verification &amp; discrepancy notes).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="transfers-dispatch-btn"
            type="button"
            onClick={() => setIsDispatchOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>+ Dispatch New Transfer</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab("incoming")}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === "incoming"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Incoming Deliveries</span>
            {pendingReceiptsCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full animate-pulse">
                {pendingReceiptsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("outbound")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === "outbound"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Outbound Dispatches</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("all")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === "all"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>All Store Transfers</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="RECEIVED">Received</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transfer #, SKU, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Transfers List */}
      {currentList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <ArrowLeftRight className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            No Transfers Found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {activeSubTab === "incoming"
              ? "There are currently no shipments in transit destined for this branch."
              : activeSubTab === "outbound"
                ? "No shipments have been dispatched from this store matching the criteria."
                : "No inter-branch transfers recorded matching the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((t) => {
            const isTargetBranch = currentBranch?.id === t.targetBranchId;
            const canConfirmReceipt =
              isTargetBranch && t.status === "IN_TRANSIT";

            const hasDiscrepancy =
              Boolean(t.hasDiscrepancy) ||
              Boolean(t.discrepancyNotes && t.discrepancyNotes.trim().length > 0) ||
              t.items?.some(
                (item) =>
                  item.quantityReceived !== undefined &&
                  item.quantityReceived !== null &&
                  item.quantityReceived !== item.quantitySent,
              );

            return (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg transition hover:border-slate-700/80 space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-white">
                      {t.transferNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        t.status === "RECEIVED"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : t.status === "IN_TRANSIT"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>

                    {hasDiscrepancy && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Discrepancy Noted</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Dispatched {new Date(t.dispatchedAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Route & People Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs bg-slate-950/50 rounded-xl p-3 border border-slate-800/60">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">
                      Source Branch (Sender)
                    </span>
                    <span className="font-semibold text-slate-200">
                      {t.sourceBranchName || "Source Branch"}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      By {t.dispatchedByName || "Manager"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">
                      Destination Branch (Receiver)
                    </span>
                    <span className="font-semibold text-emerald-400">
                      {t.targetBranchName || "Destination Branch"}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {t.receivedByName
                        ? `Confirmed by ${t.receivedByName}`
                        : "Awaiting Arrival & Physical Count"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">
                      Dispatch Notes
                    </span>
                    <span className="text-slate-300 italic">
                      {t.notes ? `"${t.notes}"` : "No dispatch notes provided."}
                    </span>
                  </div>
                </div>

                {/* Items Manifest */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                      Transferred Items ({t.items?.length || 0})
                    </span>
                    {t.status === "RECEIVED" && t.receivedAt && (
                      <span className="text-[11px] text-slate-400">
                        Received on {new Date(t.receivedAt).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {t.items?.map((item, idx) => {
                      const hasItemDiff =
                        item.quantityReceived !== undefined &&
                        item.quantityReceived !== null &&
                        item.quantityReceived !== item.quantitySent;
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-xs border ${
                            hasItemDiff
                              ? "bg-red-500/10 border-red-500/30 text-red-200"
                              : "bg-slate-950/80 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="font-semibold truncate">
                            {item.productName || item.productId}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                            <span>Sent: <strong className="text-white">{item.quantitySent}</strong></span>
                            <span>
                              Recv:{" "}
                              <strong
                                className={
                                  hasItemDiff
                                    ? "text-red-400 font-bold"
                                    : "text-emerald-400 font-semibold"
                                }
                              >
                                {item.quantityReceived ?? "—"}
                              </strong>
                            </span>
                          </div>
                          {item.notes && (
                            <div className="text-[10px] text-red-300/90 italic mt-1 truncate">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Discrepancy Note banner if present */}
                {t.discrepancyNotes && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-300">Receiving Discrepancy Explanation:</span>{" "}
                      <span>{t.discrepancyNotes}</span>
                    </div>
                  </div>
                )}

                {/* Handshake Action: Confirm Receipt */}
                {canConfirmReceipt && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setInspectingTransfer(t)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40 transition active:scale-95 cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Inspect &amp; Confirm Receipt</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch Modal */}
      {isDispatchOpen && (
        <TransferDispatchModal onClose={() => setIsDispatchOpen(false)} />
      )}

      {/* Inspect & Confirm Receipt Modal */}
      {inspectingTransfer && (
        <TransferReceiptModal
          transfer={inspectingTransfer}
          onClose={() => setInspectingTransfer(null)}
        />
      )}
    </div>
  );
};
