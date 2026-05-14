"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { label: "アップロード", step: 1 },
  { label: "確認・設定", step: 2 },
  { label: "PDF出力", step: 3 },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map(({ label, step }, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                step < current
                  ? "bg-blue-600 border-blue-600 text-white"
                  : step === current
                  ? "bg-white border-blue-600 text-blue-600"
                  : "bg-white border-gray-300 text-gray-400"
              )}
            >
              {step < current ? "✓" : step}
            </div>
            <span
              className={cn(
                "mt-1 text-xs font-medium",
                step === current ? "text-blue-600" : "text-gray-400"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "w-20 h-0.5 mb-4 mx-1",
                step < current ? "bg-blue-600" : "bg-gray-300"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
