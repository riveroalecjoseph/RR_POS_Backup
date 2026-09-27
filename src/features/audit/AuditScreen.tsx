import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { StockMovement, Transaction, TransferRecord, TransferItemRecord } from "../../types";
import {
  ShieldCheck,
  AlertTriangle,
  Sliders,
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  RotateCw,
  Building2,
} from "lucide-react";

export const AuditScreen: React.FC = () => {
  const {
    branches,
    transfers,
    stockMovements,
    transactions,
    refreshData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"discrepancies" | "ledger" | "sales">(
    "discrepancies",
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters for Discrepancies
  const [discrepancyBranchFilter, setDiscrepancyBranchFilter] = useState<string>("all");
  const [discrepancySearch, setDiscrepancySearch] = useState<string>("all");

  // Filters for Stock Movement Ledger
  const [ledgerBranchFilter, setLedgerBranchFilter] = useState<string>("all");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("all");
  const [ledgerSearch, setLedgerSearch] = useState<string>("");

  // Filters for Sales Ledger
  const [salesBranchFilter, setSalesBranchFilter] = useState<string>("all");
  const [salesPaymentFilter, setSalesPaymentFilter] = useState<string>("all");
  const [salesSearch, setSalesSearch] = useState<string>("");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // 1. Transfer Discrepancy Log
  const transfersWithDiscrepancies = useMemo(() => {
    return (transfers || []).filter((t: TransferRecord) => {
      const hasFlag = Boolean(t.hasDiscrepancy);
      const hasNotes = Boolean(t.discrepancyNotes && t.discrepancyNotes.trim().length > 0);
      const hasItemDiff = t.items?.some(
        (item: TransferItemRecord) =>
          item.quantityReceived !== undefined &&
          item.quantityReceived !== null &&
          item.quantityReceived !== item.quantitySent,
      );
      return hasFlag || hasNotes || hasItemDiff;
    });
  }, [transfers]);

  const filteredDiscrepancyTransfers = useMemo(() => {
    return transfersWithDiscrepancies.filter((t: TransferRecord) => {
      if (discrepancyBranchFilter !== "all") {
        if (t.sourceBranchId !== discrepancyBranchFilter && t.targetBranchId !== discrepancyBranchFilter) {
          return false;
        }
      }
      if (discrepancySearch !== "all" && discrepancySearch.trim()) {
        const q = discrepancySearch.toLowerCase();
        const matchesNum = t.transferNumber?.toLowerCase().includes(q);
        const matchesNotes = t.discrepancyNotes?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
        const matchesSource = (t.sourceBranchName || "").toLowerCase().includes(q);
        const matchesTarget = (t.targetBranchName || "").toLowerCase().includes(q);
        const matchesItem = t.items?.some((i) =>
          (i.productName || i.sku || "").toLowerCase().includes(q),
        );
        if (!matchesNum && !matchesNotes && !matchesSource && !matchesTarget && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [transfersWithDiscrepancies, discrepancyBranchFilter, discrepancySearch]);

  // 2. Stock Movement Ledger
  const filteredStockMovements = useMemo(() => {
    return (stockMovements || []).filter((mov: StockMovement) => {
      if (ledgerBranchFilter !== "all" && mov.branchId !== ledgerBranchFilter) {
        return false;
      }
      const mType = mov.movementType || mov.type;
      if (ledgerTypeFilter !== "all" && mType !== ledgerTypeFilter) {
        return false;
      }
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        const matchesProduct =
          (mov.productName || "").toLowerCase().includes(q) ||
          mov.productId?.toLowerCase().includes(q);
        const matchesBranch = (mov.branchName || "").toLowerCase().includes(q);
        const matchesNotes = (mov.notes || "").toLowerCase().includes(q);
        const matchesUser =
          (mov.createdByName || mov.createdBy || "").toLowerCase().includes(q);
        if (!matchesProduct && !matchesBranch && !matchesNotes && !matchesUser) {
          return false;
        }
      }
      return true;
    });
  }, [stockMovements, ledgerBranchFilter, ledgerTypeFilter, ledgerSearch]);

  // 3. Sales Ledger
  const filteredSalesTransactions = useMemo(() => {
    return (transactions || []).filter((tx: Transaction) => {
      if (salesBranchFilter !== "all" && tx.branchId !== salesBranchFilter) {
        return false;
      }
      if (salesPaymentFilter !== "all" && tx.paymentMethod !== salesPaymentFilter) {
        return false;
      }
      if (salesSearch.trim()) {
        const q = salesSearch.toLowerCase();
        const matchesNum = tx.transactionNumber?.toLowerCase().includes(q);
        const matchesCashier = (tx.cashierName || tx.cashierId || "").toLowerCase().includes(q);
        const matchesItem = tx.items?.some((i) => (i.productName || "").toLowerCase().includes(q));
        if (!matchesNum && !matchesCashier && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, salesBranchFilter, salesPaymentFilter, salesSearch]);

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Owner Audit Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise store oversight: Transfer discrepancy incident log, sequenced stock movement ledger &amp; sales transaction audit.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer text-xs font-semibold self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Audit Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto scrollbar-none">
        <button
          id="tab-discrepancies"
          onClick={() => setActiveTab("discrepancies")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            activeTab === "discrepancies"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Transfer Discrepancy Log ({transfersWithDiscrepancies.length})</span>
        </button>

        <button
          id="tab-stock-ledger"
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            activeTab === "ledger"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Sliders className="w-4 h-4 text-teal-400" />
          <span>Stock Movement Ledger ({stockMovements.length})</span>
        </button>

        <button
          id="tab-sales-ledger"
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
            activeTab === "sales"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-400" />
          <span>Sales &amp; Transaction Ledger ({transactions.length})</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 1. TRANSFER DISCREPANCY LOG */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "discrepancies" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <select
                value={discrepancyBranchFilter}
                onChange={(e) => setDiscrepancyBranchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transfer # or notes..."
                value={discrepancySearch === "all" ? "" : discrepancySearch}
                onChange={(e) => setDiscrepancySearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {filteredDiscrepancyTransfers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Zero Discrepancies Recorded
              </h3>
              <p className="text-xs text-slate-400 max-w-md">
                All inter-branch transfers and handshakes are clean. Any deliveries where physical count differed from dispatched count or incident notes were documented will be logged here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDiscrepancyTransfers.map((t) => (
                <div
                  key={t.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-bold text-white">
                        {t.transferNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Discrepancy Flagged</span>
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(t.receivedAt || t.dispatchedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">
                        Source Branch (Sender)
                      </span>
                      <span className="font-semibold text-white">
                        {t.sourceBranchName || "Source Branch"}
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        Dispatched by: {t.dispatchedByName || t.dispatchedBy || "Manager"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">
                        Destination Branch (Receiver)
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {t.targetBranchName || "Destination Branch"}
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        Received by: {t.receivedByName || t.receivedBy || "Receiving Manager"}
                      </span>
                    </div>

                    <div className="lg:col-span-2">
                      <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-0.5">
                        Manager&apos;s Discrepancy Explanation Note
                      </span>
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs font-medium">
                        {t.discrepancyNotes || "Physical item count mismatch detected between dispatch and receipt."}
                      </div>
                    </div>
                  </div>

                  {/* Items breakdown with shortage / overage delta */}
                  <div className="pt-2">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block mb-2">
                      Item Shortage / Overage Variance
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {t.items?.map((item, idx) => {
                        const sent = item.quantitySent;
                        const recv = item.quantityReceived ?? sent;
                        const delta = recv - sent;
                        const hasDiff = delta !== 0;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl text-xs border ${
                              hasDiff
                                ? "bg-red-500/10 border-red-500/30 text-red-200"
                                : "bg-slate-950/40 border-slate-800 text-slate-400"
                            }`}
                          >
                            <div className="font-bold truncate text-white">
                              {item.productName || item.productId}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[11px]">
                              <span>Dispatched: <strong className="text-slate-300">{sent}</strong></span>
                              <span>Received: <strong className="text-slate-300">{recv}</strong></span>
                              <span
                                className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                                  delta < 0
                                    ? "bg-red-500/20 text-red-400"
                                    : delta > 0
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "text-slate-500"
                                }`}
                              >
                                {delta > 0 ? `+${delta}` : delta}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[10px] text-red-300 italic mt-1 truncate">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. STOCK MOVEMENT LEDGER */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={ledgerBranchFilter}
                onChange={(e) => setLedgerBranchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Movement Types</option>
                <option value="INITIAL_STOCK">Initial Stock</option>
                <option value="Sale">Sale (POS)</option>
                <option value="Restock">Restock</option>
                <option value="TRANSFER_OUT">Transfer Out</option>
                <option value="TRANSFER_IN">Transfer In</option>
                <option value="Waste/Spoilage">Waste / Spoilage</option>
                <option value="Gift/Promo">Gift / Promo</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search product, SKU, user..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-right">Delta</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4">Notes &amp; Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredStockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        No stock movement records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStockMovements.map((mov) => {
                      const mType = mov.movementType || mov.type || "Restock";
                      const isPositive = mov.quantityDelta > 0;
                      return (
                        <tr key={mov.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(mov.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                            {mov.branchName || mov.branchId}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                            {mov.productName || mov.productId}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                mType === "Sale"
                                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                  : mType === "Restock" || mType === "INITIAL_STOCK"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : mType.includes("TRANSFER")
                                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {mType}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                              isPositive ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 whitespace-nowrap">
                            {mov.balanceAfter}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {mov.createdByName || mov.createdBy || "System / Admin"}
                          </td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                            {mov.notes || mov.referenceId || "—"}
                          </td>
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

      {/* --------------------------------------------------------------------- */}
      {/* 3. SALES & TRANSACTION LEDGER */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "sales" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={salesBranchFilter}
                onChange={(e) => setSalesBranchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={salesPaymentFilter}
                onChange={(e) => setSalesPaymentFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="e_wallet">E-Wallet (GCash / Maya)</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search receipt #, cashier..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4 text-right">Tendered</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredSalesTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500">
                        No transactions recorded matching the current criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {tx.transactionNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                          {branches.find((b) => b.id === tx.branchId)?.name || tx.branchId}
                        </td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {tx.cashierName || tx.cashierId || "Cashier"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              tx.paymentMethod === "cash"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : tx.paymentMethod === "card"
                                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                  : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                            }`}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-300">
                          {tx.items && tx.items.length > 0
                            ? tx.items.map((i) => `${i.quantity}x ${i.productName}`).join(", ")
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                          ₱{tx.amountTendered?.toFixed(2) || "0.00"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                          ₱{tx.grandTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              tx.isOffline || tx.status === "offline_synced"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {tx.isOffline ? "Offline Synced" : tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
