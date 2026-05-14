export type TradeType = "塗装" | "足場" | "板金" | "防水" | "シーリング" | "その他";

export interface QuoteItem {
  id: string;
  tradeType: TradeType;
  name: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  amount: number;
  note?: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  tradeType: TradeType;
  status: "pending" | "extracting" | "done" | "error";
  error?: string;
  items: QuoteItem[];
}

export interface MarkupSettings {
  [key: string]: number; // TradeType -> markup rate (e.g. 0.2 = 20%)
}

export interface QuoteStore {
  projectName: string;
  files: UploadedFile[];
  markupSettings: MarkupSettings;
  setProjectName: (name: string) => void;
  addFile: (file: UploadedFile) => void;
  updateFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;
  updateItem: (fileId: string, itemId: string, updates: Partial<QuoteItem>) => void;
  removeItem: (fileId: string, itemId: string) => void;
  setMarkup: (tradeType: string, rate: number) => void;
  reset: () => void;
}
