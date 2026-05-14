import { NextRequest, NextResponse } from "next/server";
import { QuoteItem, MarkupSettings } from "@/types";
import { calcMarkedUpAmount, formatCurrency, getMarkupRate } from "@/lib/utils";
import { TRADE_TYPES } from "@/lib/utils";

export const maxDuration = 30;

interface GeneratePdfRequest {
  projectName: string;
  items: QuoteItem[];
  markupSettings: MarkupSettings;
}

function buildHtml(projectName: string, items: QuoteItem[], markupSettings: MarkupSettings): string {
  const grouped = TRADE_TYPES.reduce<Record<string, QuoteItem[]>>((acc, t) => {
    const filtered = items.filter((i) => i.tradeType === t);
    if (filtered.length > 0) acc[t] = filtered;
    return acc;
  }, {});

  const grandTotal = items.reduce((sum, item) => {
    const base = item.quantity != null && item.unitPrice != null
      ? item.quantity * item.unitPrice
      : item.amount;
    return sum + calcMarkedUpAmount(base, getMarkupRate(item.tradeType, markupSettings));
  }, 0);

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });

  const sectionRows = Object.entries(grouped).map(([tradeType, tradeItems]) => {
    const tradeTotal = tradeItems.reduce((sum, item) => {
      const base = item.quantity != null && item.unitPrice != null
        ? item.quantity * item.unitPrice
        : item.amount;
      return sum + calcMarkedUpAmount(base, getMarkupRate(tradeType, markupSettings));
    }, 0);

    const itemRows = tradeItems.map((item) => {
      const base = item.quantity != null && item.unitPrice != null
        ? item.quantity * item.unitPrice
        : item.amount;
      const marked = calcMarkedUpAmount(base, getMarkupRate(tradeType, markupSettings));
      return `
        <tr class="item-row">
          <td class="name-cell">${escHtml(item.name)}</td>
          <td class="num-cell">${item.quantity != null ? formatCurrency(item.quantity) : "—"}</td>
          <td class="unit-cell">${escHtml(item.unit)}</td>
          <td class="num-cell">${item.unitPrice != null ? "¥" + formatCurrency(item.unitPrice) : "—"}</td>
          <td class="num-cell amount">¥${formatCurrency(marked)}</td>
          ${item.note ? `<td class="note-cell">${escHtml(item.note)}</td>` : "<td></td>"}
        </tr>`;
    }).join("");

    return `
      <tr class="section-header">
        <td colspan="6" class="trade-name">${escHtml(tradeType)}工事</td>
      </tr>
      ${itemRows}
      <tr class="subtotal-row">
        <td colspan="4" class="subtotal-label">${escHtml(tradeType)}工事　小計</td>
        <td class="num-cell subtotal-amount">¥${formatCurrency(tradeTotal)}</td>
        <td></td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Noto Sans JP", "Hiragino Kaku Gothic Pro", "Meiryo", sans-serif; font-size: 11px; color: #1a1a1a; background: white; padding: 20mm 15mm; }
  .header { border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; font-weight: 700; color: #1e40af; }
  .meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #555; }
  .total-box { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 12px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .total-box .label { font-size: 13px; font-weight: 600; color: #1e40af; }
  .total-box .value { font-size: 22px; font-weight: 700; color: #1e40af; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { background: #1e40af; color: white; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 600; }
  th.num-cell, td.num-cell { text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: middle; }
  .section-header td { background: #dbeafe; font-weight: 700; font-size: 11px; color: #1e40af; padding: 6px 8px; border-top: 1px solid #93c5fd; }
  .subtotal-row td { background: #f0f9ff; font-weight: 600; border-top: 1px solid #bfdbfe; }
  .subtotal-label { text-align: right; color: #1e40af; }
  .subtotal-amount { color: #1e40af; }
  .item-row:hover { background: #f9fafb; }
  .name-cell { width: 38%; }
  .num-cell { width: 10%; }
  .unit-cell { width: 7%; }
  .note-cell { color: #6b7280; font-size: 9px; }
  .amount { font-weight: 500; }
  .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 10px; color: #9ca3af; text-align: center; }
  .grand-total-row td { background: #1e40af; color: white; font-weight: 700; font-size: 12px; padding: 8px; }
  .grand-total-row .num-cell { font-size: 14px; }
</style>
</head>
<body>
  <div class="header">
    <h1>御見積書</h1>
    <div class="meta">
      <span>工事件名：${escHtml(projectName || "（未設定）")}</span>
      <span>発行日：${today}</span>
    </div>
  </div>

  <div class="total-box">
    <span class="label">御見積金額（税別）</span>
    <span class="value">¥${formatCurrency(grandTotal)}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th class="name-cell">内容・仕様</th>
        <th class="num-cell">数量</th>
        <th class="unit-cell">単位</th>
        <th class="num-cell">単価</th>
        <th class="num-cell">金額</th>
        <th>備考</th>
      </tr>
    </thead>
    <tbody>
      ${sectionRows}
      <tr class="grand-total-row">
        <td colspan="4" style="text-align:right; padding-right:16px;">合　計（税別）</td>
        <td class="num-cell">¥${formatCurrency(grandTotal)}</td>
        <td></td>
      </tr>
      <tr class="grand-total-row" style="opacity:0.85">
        <td colspan="4" style="text-align:right; padding-right:16px;">消費税（10%）</td>
        <td class="num-cell">¥${formatCurrency(grandTotal * 0.1)}</td>
        <td></td>
      </tr>
      <tr class="grand-total-row">
        <td colspan="4" style="text-align:right; padding-right:16px; font-size:13px;">御見積金額（税込）</td>
        <td class="num-cell" style="font-size:15px;">¥${formatCurrency(grandTotal * 1.1)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">※ 本見積書の有効期限は発行日より1ヶ月です。</div>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePdfRequest = await req.json();
    const { projectName, items, markupSettings } = body;

    const html = buildHtml(projectName, items, markupSettings);

    // Use Playwright/Puppeteer if available, otherwise return HTML for client-side print
    // For MVP: return HTML with print stylesheet — browser's native print-to-PDF
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-PDF-Mode": "print",
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF生成エラー" }, { status: 500 });
  }
}
