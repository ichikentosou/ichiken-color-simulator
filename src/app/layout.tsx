import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "元請け見積まとめツール",
  description: "下請け見積書を統合見積書に自動変換",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
