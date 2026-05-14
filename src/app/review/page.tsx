"use client";

import { useRouter } from "next/navigation";
import { Trash2, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { useQuoteStore } from "@/store/quoteStore";
import { StepIndicator } from "@/components/StepIndicator";
import { TRADE_TYPES, cn, formatCurrency, calcMarkedUpAmount, getMarkupRate } from "@/lib/utils";
import { QuoteItem, TradeType } from "@/types";

export default function ReviewPage() {
  const router = useRouter();
  const { files, markupSettings, setMarkup, updateItem, removeItem, updateFile } = useQuoteStore();

  const allItems = files.flatMap((f) => f.status === "done" ? f.items : []);
  const hasErrors = files.some((f) => f.status === "error");
  const isExtracting = files.some((f) => f.status === "extracting");

  const grandTotal = allItems.reduce((sum, item) => {
    const base = item.quantity != null && item.unitPrice != null
      ? item.quantity * item.unitPrice
      : item.amount;
    return sum + calcMarkedUpAmount(base, getMarkupRate(item.tradeType, markupSettings));
  }, 0);

  // Group by trade type
  const grouped = TRADE_TYPES.reduce<Record<string, QuoteItem[]>>((acc, t) => {
    const filtered = allItems.filter((i) => i.tradeType === t);
    if (filtered.length > 0) acc[t] = filtered;
    return acc;
  }, {});

  if (files.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ファイルがありません</p>
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 underline text-sm"
          >
            アップロード画面に戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">元請け見積まとめツール</h1>
        </div>

        <StepIndicator current={2} />

        {/* Status bar */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {files.map((f) => (
            <div
              key={f.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border",
                f.status === "done" && "bg-green-50 border-green-200 text-green-700",
                f.status === "extracting" && "bg-blue-50 border-blue-200 text-blue-700",
                f.status === "error" && "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {f.status === "done" && <CheckCircle2 size={13} />}
              {f.status === "extracting" && <Loader2 size={13} className="animate-spin" />}
              {f.status === "error" && <AlertCircle size={13} />}
              <span className="truncate max-w-[160px]">{f.fileName}</span>
              {f.status === "done" && <span className="text-green-500">({f.items.length}件)</span>}
              {f.status === "error" && <span className="text-red-500">{f.error}</span>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          {/* Left: item table */}
          <div className="space-y-4">
            {isExtracting && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 text-blue-700 text-sm">
                <Loader2 size={16} className="animate-spin shrink-0" />
                AIが見積書を解析中です…完了次第テーブルに反映されます
              </div>
            )}

            {Object.entries(grouped).map(([tradeType, items]) => {
              const tradeTotal = items.reduce((sum, item) => {
                const base = item.quantity != null && item.unitPrice != null
                  ? item.quantity * item.unitPrice
                  : item.amount;
                return sum + calcMarkedUpAmount(base, getMarkupRate(tradeType, markupSettings));
              }, 0);

              return (
                <div key={tradeType} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
                    <span className="font-semibold text-sm">{tradeType}工事</span>
                    <span className="text-sm font-bold">小計 ¥{formatCurrency(tradeTotal)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 font-semibold text-gray-600 w-[35%]">項目名</th>
                          <th className="text-right px-2 py-2 font-semibold text-gray-600 w-[10%]">数量</th>
                          <th className="text-left px-2 py-2 font-semibold text-gray-600 w-[8%]">単位</th>
                          <th className="text-right px-2 py-2 font-semibold text-gray-600 w-[12%]">単価</th>
                          <th className="text-right px-2 py-2 font-semibold text-gray-600 w-[14%]">金額（込）</th>
                          <th className="text-left px-2 py-2 font-semibold text-gray-600">備考</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const base = item.quantity != null && item.unitPrice != null
                            ? item.quantity * item.unitPrice
                            : item.amount;
                          const marked = calcMarkedUpAmount(base, getMarkupRate(tradeType, markupSettings));
                          // Find file id for this item
                          const fileId = files.find((f) => f.items.some((i) => i.id === item.id))?.id ?? "";

                          return (
                            <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                              <td className="px-3 py-2">
                                <input
                                  className="w-full bg-transparent focus:bg-white focus:border focus:border-blue-300 rounded px-1 focus:outline-none"
                                  value={item.name}
                                  onChange={(e) => updateItem(fileId, item.id, { name: e.target.value })}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  className="w-full text-right bg-transparent focus:bg-white focus:border focus:border-blue-300 rounded px-1 focus:outline-none"
                                  value={item.quantity ?? ""}
                                  onChange={(e) =>
                                    updateItem(fileId, item.id, {
                                      quantity: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  className="w-full bg-transparent focus:bg-white focus:border focus:border-blue-300 rounded px-1 focus:outline-none"
                                  value={item.unit}
                                  onChange={(e) => updateItem(fileId, item.id, { unit: e.target.value })}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  className="w-full text-right bg-transparent focus:bg-white focus:border focus:border-blue-300 rounded px-1 focus:outline-none"
                                  value={item.unitPrice ?? ""}
                                  onChange={(e) =>
                                    updateItem(fileId, item.id, {
                                      unitPrice: e.target.value === "" ? null : Number(e.target.value),
                                    })
                                  }
                                />
                              </td>
                              <td className="px-2 py-2 text-right font-medium text-gray-800">
                                ¥{formatCurrency(marked)}
                              </td>
                              <td className="px-2 py-2 text-gray-400">
                                <input
                                  className="w-full bg-transparent focus:bg-white focus:border focus:border-blue-300 rounded px-1 focus:outline-none text-xs"
                                  value={item.note ?? ""}
                                  onChange={(e) => updateItem(fileId, item.id, { note: e.target.value })}
                                />
                              </td>
                              <td className="px-1">
                                <button
                                  onClick={() => removeItem(fileId, item.id)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {allItems.length === 0 && !isExtracting && (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                抽出された明細がありません
              </div>
            )}
          </div>

          {/* Right: markup settings + summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">マークアップ率設定</h3>
              <div className="space-y-3">
                {TRADE_TYPES.map((t) => {
                  const hasItems = allItems.some((i) => i.tradeType === t);
                  return (
                    <div key={t} className={cn("flex items-center gap-2", !hasItems && "opacity-40")}>
                      <span className="text-xs text-gray-600 w-20 shrink-0">{t}</span>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        step={1}
                        value={Math.round((markupSettings[t] ?? 0) * 100)}
                        onChange={(e) => setMarkup(t, Number(e.target.value) / 100)}
                        className="flex-1 accent-blue-600"
                      />
                      <span className="text-xs font-mono w-9 text-right text-blue-600">
                        {Math.round((markupSettings[t] ?? 0) * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-600 rounded-xl p-4 text-white">
              <div className="text-xs opacity-75 mb-1">見積合計（税別）</div>
              <div className="text-2xl font-bold">¥{formatCurrency(grandTotal)}</div>
              <div className="text-xs opacity-75 mt-1">
                税込 ¥{formatCurrency(grandTotal * 1.1)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-semibold text-sm"
          >
            <ChevronLeft size={16} />
            戻る
          </button>
          <button
            onClick={() => router.push("/preview")}
            disabled={allItems.length === 0}
            className={cn(
              "flex-1 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors",
              allItems.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            PDF出力へ
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </main>
  );
}
