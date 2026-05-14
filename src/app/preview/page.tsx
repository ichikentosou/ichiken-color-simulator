"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download, Printer, Loader2 } from "lucide-react";
import { useQuoteStore } from "@/store/quoteStore";
import { StepIndicator } from "@/components/StepIndicator";
import { cn, formatCurrency, calcMarkedUpAmount, getMarkupRate, TRADE_TYPES } from "@/lib/utils";
import { QuoteItem } from "@/types";

export default function PreviewPage() {
  const router = useRouter();
  const { projectName, files, markupSettings } = useQuoteStore();
  const [generating, setGenerating] = useState(false);

  const allItems = files.flatMap((f) => (f.status === "done" ? f.items : []));

  const grouped = TRADE_TYPES.reduce<Record<string, QuoteItem[]>>((acc, t) => {
    const filtered = allItems.filter((i) => i.tradeType === t);
    if (filtered.length > 0) acc[t] = filtered;
    return acc;
  }, {});

  const grandTotal = allItems.reduce((sum, item) => {
    const base =
      item.quantity != null && item.unitPrice != null
        ? item.quantity * item.unitPrice
        : item.amount;
    return sum + calcMarkedUpAmount(base, getMarkupRate(item.tradeType, markupSettings));
  }, 0);

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handlePrint = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, items: allItems, markupSettings }),
      });
      const html = await res.text();

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("ポップアップがブロックされています。ブラウザの設定を確認してください。");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    } finally {
      setGenerating(false);
    }
  };

  if (allItems.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">データがありません</p>
          <button onClick={() => router.push("/")} className="text-blue-600 underline text-sm">
            最初から始める
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">元請け見積まとめツール</h1>
        </div>

        <StepIndicator current={3} />

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => router.push("/review")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-medium"
          >
            <ChevronLeft size={15} />
            編集に戻る
          </button>
          <button
            onClick={handlePrint}
            disabled={generating}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-white text-sm transition-colors",
              generating ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {generating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Printer size={15} />
            )}
            印刷 / PDF保存
          </button>
        </div>

        {/* Preview card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="border-b-2 border-blue-700 px-8 py-6">
            <h2 className="text-3xl font-bold text-blue-700">御見積書</h2>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>工事件名：{projectName || "（未設定）"}</span>
              <span>発行日：{today}</span>
            </div>
          </div>

          {/* Total box */}
          <div className="px-8 py-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="font-semibold text-blue-700 text-sm">御見積金額（税別）</span>
            <span className="text-3xl font-bold text-blue-700">¥{formatCurrency(grandTotal)}</span>
          </div>

          {/* Table */}
          <div className="px-8 py-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="text-left p-2 rounded-tl">内容・仕様</th>
                  <th className="text-right p-2 w-16">数量</th>
                  <th className="text-left p-2 w-12">単位</th>
                  <th className="text-right p-2 w-20">単価</th>
                  <th className="text-right p-2 w-24">金額</th>
                  <th className="text-left p-2 rounded-tr">備考</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([tradeType, items]) => {
                  const tradeTotal = items.reduce((sum, item) => {
                    const base =
                      item.quantity != null && item.unitPrice != null
                        ? item.quantity * item.unitPrice
                        : item.amount;
                    return sum + calcMarkedUpAmount(base, getMarkupRate(tradeType, markupSettings));
                  }, 0);

                  return (
                    <>
                      <tr key={`${tradeType}-header`} className="bg-blue-100">
                        <td colSpan={6} className="p-2 font-bold text-blue-700 text-xs border-t border-blue-200">
                          {tradeType}工事
                        </td>
                      </tr>
                      {items.map((item) => {
                        const base =
                          item.quantity != null && item.unitPrice != null
                            ? item.quantity * item.unitPrice
                            : item.amount;
                        const marked = calcMarkedUpAmount(
                          base,
                          getMarkupRate(tradeType, markupSettings)
                        );
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-right">
                              {item.quantity != null ? formatCurrency(item.quantity) : "—"}
                            </td>
                            <td className="p-2">{item.unit}</td>
                            <td className="p-2 text-right">
                              {item.unitPrice != null ? "¥" + formatCurrency(item.unitPrice) : "—"}
                            </td>
                            <td className="p-2 text-right font-medium">¥{formatCurrency(marked)}</td>
                            <td className="p-2 text-gray-400">{item.note ?? ""}</td>
                          </tr>
                        );
                      })}
                      <tr key={`${tradeType}-subtotal`} className="bg-blue-50 font-semibold">
                        <td colSpan={4} className="p-2 text-right text-blue-700 text-xs">
                          {tradeType}工事　小計
                        </td>
                        <td className="p-2 text-right text-blue-700">
                          ¥{formatCurrency(tradeTotal)}
                        </td>
                        <td></td>
                      </tr>
                    </>
                  );
                })}

                {/* Grand total rows */}
                <tr className="bg-blue-700 text-white font-bold">
                  <td colSpan={4} className="p-3 text-right">合　計（税別）</td>
                  <td className="p-3 text-right text-lg">¥{formatCurrency(grandTotal)}</td>
                  <td></td>
                </tr>
                <tr className="bg-blue-600 text-white text-xs">
                  <td colSpan={4} className="p-2 text-right opacity-80">消費税（10%）</td>
                  <td className="p-2 text-right opacity-80">¥{formatCurrency(grandTotal * 0.1)}</td>
                  <td></td>
                </tr>
                <tr className="bg-blue-700 text-white font-bold">
                  <td colSpan={4} className="p-3 text-right text-sm">御見積金額（税込）</td>
                  <td className="p-3 text-right text-xl">¥{formatCurrency(grandTotal * 1.1)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            ※ 本見積書の有効期限は発行日より1ヶ月です。
          </div>
        </div>

        {/* Markup summary */}
        <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-500 mb-2">適用マークアップ率</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(markupSettings)
              .filter(([t]) => allItems.some((i) => i.tradeType === t))
              .map(([t, rate]) => (
                <span
                  key={t}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium"
                >
                  {t}：{Math.round(rate * 100)}%
                </span>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
