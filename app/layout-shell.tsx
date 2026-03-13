"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import AuthProvider from "./auth-provider";
import Sidebar from "./sidebar";

type Props = {
  children: React.ReactNode;
};

export default function LayoutShell({ children }: Props) {
  const pathname = usePathname();
  const isPublicEvent = pathname?.startsWith("/public-events");

  // For public event pages, render a clean standalone layout (no dashboard shell)
  if (isPublicEvent) {
    return <div className="min-h-screen bg-[#f7f8fb] text-zinc-900">{children}</div>;
  }

  // Default dashboard layout
  return (
    <AuthProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </AuthProvider>
  );
}
