"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HIDE_WEEKLY = true;

export default function WeeklyPlaceholder() {
  const router = useRouter();

  useEffect(() => {
    if (HIDE_WEEKLY) {
      // Keep UX consistent for existing bookmarks by nudging users back to dashboard.
      const timer = setTimeout(() => router.replace("/"), 2200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [router]);

  if (!HIDE_WEEKLY) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-6 py-12 text-zinc-900">
      <div className="max-w-xl space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
          Weekly Funnel
        </p>
        <h1 className="text-2xl font-bold text-[#0f172a]">
          Halaman ini sementara disembunyikan
        </h1>
        <p className="text-sm text-zinc-600">
          Per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}, halaman
          funnel mingguan sedang dimatikan sementara. Silakan gunakan Dashboard atau laman lain untuk
          memantau kinerja.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-[#1f3c88] bg-[#1f3c88] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a4fb2]"
          >
            Kembali ke Dashboard
          </Link>
          <Link
            href="/sales"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#0f5132] shadow-sm transition hover:border-[#0f5132]"
          >
            Lihat Sales
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          Butuh akses lagi? Hubungi tim dashboard untuk mengaktifkan kembali halaman ini.
        </p>
      </div>
    </main>
  );
}
