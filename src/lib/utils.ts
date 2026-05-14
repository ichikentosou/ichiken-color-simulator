import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { QuoteItem, MarkupSettings } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(Math.round(amount));
}

export function calcItemAmount(item: QuoteItem): number {
  if (item.quantity !== null && item.unitPrice !== null) {
    return item.quantity * item.unitPrice;
  }
  return item.amount;
}

export function calcMarkedUpAmount(amount: number, markup: number): number {
  return amount * (1 + markup);
}

export function getMarkupRate(tradeType: string, settings: MarkupSettings): number {
  return settings[tradeType] ?? 0;
}

export const TRADE_TYPES = ["塗装", "足場", "板金", "防水", "シーリング", "その他"] as const;

export const DEFAULT_MARKUP: MarkupSettings = {
  塗装: 0.2,
  足場: 0.15,
  板金: 0.2,
  防水: 0.2,
  シーリング: 0.15,
  その他: 0.1,
};
