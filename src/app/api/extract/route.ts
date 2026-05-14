import { NextRequest, NextResponse } from "next/server";
import { TradeType, QuoteItem } from "@/types";
import { parsePdf, parseExcel, bufferToBase64 } from "@/lib/parsers";
import { extractItemsFromText, extractItemsFromImage } from "@/lib/claude";
import { randomUUID } from "crypto";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tradeType = formData.get("tradeType") as TradeType;

    if (!file || !tradeType) {
      return NextResponse.json({ error: "ファイルと工種は必須です" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const mimeType = file.type;

    let rawItems: Omit<QuoteItem, "id" | "tradeType">[];

    if (mimeType === "application/pdf") {
      const text = await parsePdf(buffer);
      if (text.trim().length > 50) {
        // Text-based PDF
        rawItems = await extractItemsFromText(text, tradeType, fileName);
      } else {
        // Likely scanned PDF — use vision (convert to base64 directly)
        const base64 = bufferToBase64(buffer);
        rawItems = await extractItemsFromImage(base64, "image/jpeg", tradeType, fileName);
      }
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      const text = parseExcel(buffer);
      rawItems = await extractItemsFromText(text, tradeType, fileName);
    } else if (mimeType.startsWith("image/")) {
      const base64 = bufferToBase64(buffer);
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const safeType = validTypes.includes(mimeType)
        ? (mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp")
        : "image/jpeg";
      rawItems = await extractItemsFromImage(base64, safeType, tradeType, fileName);
    } else {
      return NextResponse.json(
        { error: `非対応のファイル形式です: ${mimeType}` },
        { status: 400 }
      );
    }

    const items: QuoteItem[] = rawItems.map((item) => ({
      ...item,
      id: randomUUID(),
      tradeType,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "抽出中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
