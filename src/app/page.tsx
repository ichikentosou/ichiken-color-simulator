"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileText, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { useQuoteStore } from "@/store/quoteStore";
import { StepIndicator } from "@/components/StepIndicator";
import { TRADE_TYPES, cn } from "@/lib/utils";
import { TradeType, UploadedFile } from "@/types";

interface PendingFile {
  id: string;
  file: File;
  tradeType: TradeType;
}

function newId() {
  return Math.random().toString(36).slice(2);
}

function guessTradeType(fileName: string): TradeType {
  const name = fileName.toLowerCase();
  if (name.includes("塗装") || name.includes("paint")) return "塗装";
  if (name.includes("足場") || name.includes("scaffold")) return "足場";
  if (name.includes("板金") || name.includes("sheet")) return "板金";
  if (name.includes("防水") || name.includes("water")) return "防水";
  if (name.includes("シール") || name.includes("seal")) return "シーリング";
  return "その他";
}

export default function UploadPage() {
  const router = useRouter();
  const { projectName, setProjectName, addFile, updateFile, files, reset } = useQuoteStore();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addPendingFiles = (newFiles: File[]) => {
    const entries: PendingFile[] = newFiles.map((file) => ({
      id: newId(),
      file,
      tradeType: guessTradeType(file.name),
    }));
    setPendingFiles((prev) => [...prev, ...entries]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addPendingFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addPendingFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleStart = async () => {
    if (pendingFiles.length === 0) return;
    setProcessing(true);

    const registered: UploadedFile[] = pendingFiles.map((pf) => ({
      id: pf.id,
      fileName: pf.file.name,
      tradeType: pf.tradeType,
      status: "extracting",
      items: [],
    }));
    registered.forEach((f) => addFile(f));

    await Promise.all(
      pendingFiles.map(async (pf) => {
        try {
          const form = new FormData();
          form.append("file", pf.file);
          form.append("tradeType", pf.tradeType);
          const res = await fetch("/api/extract", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "抽出失敗");
          updateFile(pf.id, { status: "done", items: data.items });
        } catch (err) {
          updateFile(pf.id, {
            status: "error",
            error: err instanceof Error ? err.message : "不明なエラー",
          });
        }
      })
    );

    setProcessing(false);
    router.push("/review");
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">元請け見積まとめツール</h1>
          <p className="text-gray-500 text-sm mt-1">
            下請け見積書をアップロードして統合見積書を自動作成
          </p>
        </div>

        <StepIndicator current={1} />

        {/* Project name */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">工事件名</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="例：〇〇様邸 外壁塗装工事"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer mb-5",
            dragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto mb-3 text-blue-500" size={36} />
          <p className="font-semibold text-gray-700">
            ファイルをドロップ、またはクリックして選択
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PDF / Excel (.xlsx, .xls) / 画像 (JPG, PNG)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Pending file list */}
        {pendingFiles.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                アップロードするファイル（{pendingFiles.length}件）
              </span>
              <button
                onClick={() => setPendingFiles([])}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                すべて削除
              </button>
            </div>
            {pendingFiles.map((pf) => (
              <div
                key={pf.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
              >
                <FileText size={18} className="text-blue-400 shrink-0" />
                <span className="text-sm text-gray-700 flex-1 truncate">{pf.file.name}</span>
                <select
                  value={pf.tradeType}
                  onChange={(e) => {
                    const val = e.target.value as TradeType;
                    setPendingFiles((prev) =>
                      prev.map((f) => (f.id === pf.id ? { ...f, tradeType: val } : f))
                    );
                  }}
                  className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                >
                  {TRADE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={() => setPendingFiles((prev) => prev.filter((f) => f.id !== pf.id))}
                  className="text-gray-300 hover:text-red-400"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Already-processed files warning */}
        {files.length > 0 && (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm mb-5">
            <AlertCircle size={16} />
            <span>
              既に {files.length} 件処理済みです。
              <button
                onClick={() => { reset(); setPendingFiles([]); }}
                className="ml-1 underline font-medium"
              >
                リセット
              </button>
              して最初からやり直すか、そのまま追加できます。
            </span>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={pendingFiles.length === 0 || processing}
          className={cn(
            "w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-colors",
            pendingFiles.length === 0 || processing
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {processing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              AIが抽出中…（しばらくお待ちください）
            </>
          ) : (
            <>
              抽出開始
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </main>
  );
}
