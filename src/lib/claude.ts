import Anthropic from "@anthropic-ai/sdk";
import { QuoteItem, TradeType } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `あなたは建設・塗装業界の見積書解析の専門家です。
以下の見積書から全明細行を抽出してください。

抽出ルール:
- 各明細行を1オブジェクトとして出力する
- 業者名・会社情報・合計欄・小計欄・諸経費・消費税行は除外する
- 項目名は原文のまま記載する
- 数量・単価が読み取れない場合はnullとする
- 金額は数量×単価で計算できる場合は計算し、できない場合は読み取った金額をそのまま使う
- 単位は m / m² / m³ / 式 / ヶ所 / 本 / 枚 / 台 / セット / ヶット などを使う

必ずJSON配列のみで返してください（説明文不要）:
[{"name":"項目名","quantity":数量またはnull,"unit":"単位","unitPrice":単価またはnull,"amount":金額,"note":"備考（任意）"}]`;

export async function extractItemsFromText(
  text: string,
  tradeType: TradeType,
  fileName: string
): Promise<Omit<QuoteItem, "id" | "tradeType">[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `ファイル名: ${fileName}\n工種: ${tradeType}\n\n見積書テキスト:\n${text}\n\n${EXTRACTION_PROMPT}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJsonResponse(content.text);
}

export async function extractItemsFromImage(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  tradeType: TradeType,
  fileName: string
): Promise<Omit<QuoteItem, "id" | "tradeType">[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: `ファイル名: ${fileName}\n工種: ${tradeType}\n\n${EXTRACTION_PROMPT}`,
          },
        ],
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJsonResponse(content.text);
}

function parseJsonResponse(text: string): Omit<QuoteItem, "id" | "tradeType">[] {
  // Extract JSON array from response (handle markdown code blocks)
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON配列が見つかりませんでした");

  const raw = JSON.parse(match[0]);
  return raw.map((item: Record<string, unknown>) => ({
    name: String(item.name ?? ""),
    quantity: item.quantity != null ? Number(item.quantity) : null,
    unit: String(item.unit ?? "式"),
    unitPrice: item.unitPrice != null ? Number(item.unitPrice) : null,
    amount: Number(item.amount ?? 0),
    note: item.note ? String(item.note) : undefined,
  }));
}
