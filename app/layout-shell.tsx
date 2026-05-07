"use client";

import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import AuthProvider from "./auth-provider";
import Sidebar from "./sidebar";

type Props = {
  children: React.ReactNode;
};

export default function LayoutShell({ children }: Props) {
  const pathname = usePathname();
  const isPublicEvent = pathname?.startsWith("/public-events");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("crm_token");
    const userStr = localStorage.getItem("crm_user");
    
    if (token && userStr) {
      setIsAuthenticated(true);
    } else if (pathname !== "/login") {
      // Only redirect if not already on login page
      window.location.href = "/login";
    }
    setLoading(false);
  }, [pathname]);

  // Show login page without sidebar
  if (pathname === "/login") {
    return (
      <div className="min-h-screen bg-[#eef1f7] text-zinc-900">
        {children}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef1f7]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#1f3c88] border-t-transparent mx-auto"></div>
          <p className="text-sm text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

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