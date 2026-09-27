import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  X,
  Trophy,
  TrendingUp,
  Sparkles,
  Download,
  Printer,
  Calendar,
  Building2,
  Package,
} from "lucide-react";

interface AnalyticsModalProps {
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ onClose }) => {
  const { branches, currentBranch, transactions, transfers, products } =
    useApp();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-09");

  // Filter transactions by selected branch and month (excluding Sandbox Practice Mode)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const isPractice =
        Boolean(tx.notes?.includes("[Practice Mode]")) ||
        tx.id.startsWith("tx-sandbox-");
      if (isPractice) return false;

      const matchesBranch =
        selectedBranchId === "all" || tx.branchId === selectedBranchId;
      const txMonth = tx.createdAt.substring(0, 7);
      const matchesMonth = txMonth === selectedMonth;
      return matchesBranch && matchesMonth;
    });
  }, [transactions, selectedBranchId, selectedMonth]);

  // Aggregate product volume and revenue
  const productPerformance = useMemo(() => {
    const stats: Record<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        unitsSold: number;
        totalRevenue: number;
      }
    > = {};

    for (const tx of filteredTransactions) {
      for (const item of tx.items) {
        if (!stats[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          stats[item.productId] = {
            productId: item.productId,
            name: item.productName || prod?.name || "Unknown Product",
            sku: prod?.sku || "SKU",
            unitsSold: 0,
            totalRevenue: 0,
          };
        }
        stats[item.productId].unitsSold += item.quantity;
        stats[item.productId].totalRevenue += item.subtotal;
      }
    }

    const items = Object.values(stats);
    const topByVolume = [...items]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 3);
    const topByRevenue = [...items]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 3);

    return {
      topByVolume,
      topByRevenue,
      allItems: items,
    };
  }, [filteredTransactions, products]);

  // Inter-branch velocity patterns from completed genuine transfers (excluding Practice Mode)
  const velocityInsights = useMemo(() => {
    // Analyze completed authentic production transfers
    const completed = transfers.filter(
      (t) =>
        t.status === "RECEIVED" &&
        !t.isPracticeMode &&
        !t.notes?.includes("[Practice Mode]"),
    );
    const transferPatterns: Array<{
      productName: string;
      source: string;
      target: string;
      totalUnits: number;
      frequency: number;
      recommendation: string;
    }> = [];

    const grouped: Record<
      string,
      {
        units: number;
        count: number;
        source: string;
        target: string;
        prodName: string;
      }
    > = {};

    for (const t of completed) {
      for (const item of t.items) {
        const key = `${t.sourceBranchId}_${t.targetBranchId}_${item.productId}`;
        if (!grouped[key]) {
          grouped[key] = {
            units: 0,
            count: 0,
            source: t.sourceBranchName || "Source Branch",
            target: t.targetBranchName || "Target Branch",
            prodName: item.productName || item.productId,
          };
        }
        grouped[key].units += item.quantityReceived || item.quantitySent;
        grouped[key].count += 1;
      }
    }

    for (const g of Object.values(grouped)) {
      transferPatterns.push({
        productName: g.prodName,
        source: g.source,
        target: g.target,
        totalUnits: g.units,
        frequency: g.count,
        recommendation: `${g.prodName} consistently transfers from ${g.source} to ${g.target} (${g.units} units across ${g.count} batches). Consider permanently increasing direct supplier POs to ${g.target} to cut transit time and freight overhead.`,
      });
    }

    // Default intelligent recommendation if branches are available
    if (transferPatterns.length === 0 && branches.length >= 2) {
      transferPatterns.push({
        productName: products[0]?.name || "High Velocity Stock",
        source: branches[0].name,
        target: branches[1].name,
        totalUnits: 0,
        frequency: 0,
        recommendation: `Monitor replenishment balance between ${branches[0].name} and ${branches[1].name} to cut transit time and freight overhead.`,
      });
    }

    return transferPatterns;
  }, [transfers, branches, products]);

  // Seasonal Demand Spotlights
  const seasonalSpotlights = useMemo(() => {
    return [
      {
        product: "Cold Brew Reserve 500ml",
        trend: "+42% Surge",
        category: "Beverages",
        description:
          "High morning commute foot-traffic driving rapid turn rate.",
        action: "Increase buffer threshold from 15 to 30 units before weekend.",
      },
      {
        product: "Butter Croissant Premium",
        trend: "+28% Run Rate",
        category: "Bakery",
        description: "Strong breakfast pairing with specialty coffees.",
        action: "Advance supplier baking order by 6:00 AM daily.",
      },
      {
        product: "Truffle Sea Salt Kettle Chips",
        trend: "+19% Volume",
        category: "Snacks",
        description: "Impulse add-on at checkout.",
        action: "Maintain eye-level point-of-sale counter placement.",
      },
    ];
  }, []);

  // CSV Export Handler
  const handleExportCSV = () => {
    const rows = [
      ["RR POS & Inventory Management System - Monthly Trend Analysis Report"],
      [
        `Month: ${selectedMonth}`,
        `Branch: ${selectedBranchId === "all" ? "Global Network" : currentBranch?.name}`,
      ],
      [""],
      ["TOP PRODUCTS BY VOLUME (UNITS SOLD)"],
      ["Rank", "Product Name", "SKU", "Units Sold", "Total Revenue (PHP)"],
      ...productPerformance.topByVolume.map((p, idx) => [
        `#${idx + 1}`,
        p.name,
        p.sku,
        p.unitsSold.toString(),
        p.totalRevenue.toFixed(2),
      ]),
      [""],
      ["TOP PRODUCTS BY REVENUE (PHP)"],
      ["Rank", "Product Name", "SKU", "Units Sold", "Total Revenue (PHP)"],
      ...productPerformance.topByRevenue.map((p, idx) => [
        `#${idx + 1}`,
        p.name,
        p.sku,
        p.unitsSold.toString(),
        p.totalRevenue.toFixed(2),
      ]),
      [""],
      ["INTER-BRANCH VELOCITY INSIGHTS"],
      [
        "Product",
        "Source Branch",
        "Target Branch",
        "Total Units",
        "Recommendation",
      ],
      ...velocityInsights.map((v) => [
        v.productName,
        v.source,
        v.target,
        v.totalUnits.toString(),
        `"${v.recommendation}"`,
      ]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RR_Monthly_Trends_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative text-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2 text-teal-400 mb-1">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-xl font-black tracking-tight text-white">
                Monthly Trend Analysis &amp; Smart Insights
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Rankings, inter-branch velocity metrics, and AI-driven restocking
              recommendations
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">
                  All Network Branches (Global)
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Top 3 Products Ranking per Month */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                Top 3 Products Ranking ({selectedMonth})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Highest Volume Podiums */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Highest Volume (Units Sold)</span>
                  <span className="text-teal-400">Volume Leaderboard</span>
                </div>

                <div className="space-y-2.5">
                  {productPerformance.topByVolume.map((prod, index) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div
                        key={prod.productId}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {medals[index] || `#${index + 1}`}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-100">
                              {prod.name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {prod.sku}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-emerald-400">
                            {prod.unitsSold} units
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ₱{prod.totalRevenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {productPerformance.topByVolume.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No sales recorded for this timeframe.
                    </div>
                  )}
                </div>
              </div>

              {/* Highest Revenue Podiums */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Highest Revenue Generated (₱)</span>
                  <span className="text-teal-400">Revenue Leaderboard</span>
                </div>

                <div className="space-y-2.5">
                  {productPerformance.topByRevenue.map((prod, index) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div
                        key={prod.productId}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {medals[index] || `#${index + 1}`}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-100">
                              {prod.name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {prod.sku}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-sm text-emerald-400">
                            ₱{prod.totalRevenue.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {prod.unitsSold} units sold
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {productPerformance.topByRevenue.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No sales recorded for this timeframe.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Branch Velocity Insights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                Inter-Branch Velocity &amp; Movement Patterns
              </h3>
            </div>

            <div className="space-y-3">
              {velocityInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-gradient-to-r from-slate-950/80 to-slate-900/80 border border-teal-500/20 shadow-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-teal-300">
                      {insight.productName}
                    </span>
                    <span className="text-[10px] font-semibold bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/20">
                      {insight.totalUnits} Units Transferred
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {insight.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Seasonal Demand Spotlights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
                Seasonal Demand Spotlights &amp; Restock Advisories
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {seasonalSpotlights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {item.trend}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 mb-1">
                      {item.product}
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[10px] text-purple-300 font-medium">
                    Proactive Action: {item.action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
