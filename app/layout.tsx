import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "./layout-shell";

export const metadata: Metadata = {
  title: "Partnership Dashboard",
  description: "Dashboard untuk mengelola kemitraan dan kolaborasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#eef1f7] text-zinc-900">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
