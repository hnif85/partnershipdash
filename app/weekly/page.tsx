"use client";

import { useEffect, useMemo, useState } from "react";

type StageKey = "s1" | "s2" | "s3" | "s4" | "s5";
type AggregatedDatum = { label: string; count: number };
type BreakdownDatum = { label: string; count: number };
type DateComposition = { label: string; count: number; breakdown: BreakdownDatum[] };
type ParsedDateDatum = AggregatedDatum & { dateObj: Date };

const stagePalette: Record<StageKey, string> = {
  s1: "#1f3c88",
  s2: "#2a4fb2",
  s3: "#0f766e",
  s4: "#138f7a",
  s5: "#0f5132",
};

const chartData: Array<{
  date: string;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
}> = [
  { date: "Nov 01", s1: 2400, s2: 1820, s3: 1240, s4: 980, s5: 320 },
  { date: "Nov 05", s1: 2620, s2: 1980, s3: 1410, s4: 1120, s5: 360 },
  { date: "Nov 09", s1: 2810, s2: 2140, s3: 1570, s4: 1260, s5: 410 },
  { date: "Nov 13", s1: 2980, s2: 2310, s3: 1730, s4: 1370, s5: 480 },
  { date: "Nov 17", s1: 3120, s2: 2450, s3: 1850, s4: 1460, s5: 520 },
  { date: "Nov 21", s1: 3250, s2: 2570, s3: 1970, s4: 1560, s5: 560 },
  { date: "Nov 25", s1: 3370, s2: 2680, s3: 2070, s4: 1650, s5: 610 },
  { date: "Nov 29", s1: 3460, s2: 2770, s3: 2150, s4: 1710, s5: 650 },
  { date: "Dec 03", s1: 3530, s2: 2840, s3: 2220, s4: 1780, s5: 690 },
  { date: "Dec 07", s1: 3600, s2: 2920, s3: 2290, s4: 1840, s5: 730 },
];

const summaryCards = [
  { key: "s1", label: "S1 - Database", value: "N/A", trend: "+4.1% vs 7d", conversion: "Baseline" },
  { key: "s2", label: "S2 - Account Created", value: "N/A", trend: "+3.5% vs 7d", conversion: "S1 -> S2: 81%" },
  { key: "s3", label: "S3 - Activated", value: "N/A", trend: "+4.0% vs 7d", conversion: "S2 -> S3: 78%" },
  { key: "s4", label: "S4 - Active Users", value: "N/A", trend: "+3.8% vs 7d", conversion: "S3 -> S4: 96%" },
  { key: "s5", label: "S5 - Paid Users", value: "N/A", trend: "+6.2% vs 7d", conversion: "S4 -> S5: 40%" },
] as const;

const chartHeight = 320;
const chartWidth = 1100;
const chartPadding = 48;
const dateChartHeight = 280;
const dateChartWidth = 1100;
const dateChartPadding = 40;
const barChartHeight = 280;
const barChartWidth = 1100;
const barChartPadding = 56;
const s2ChartHeight = 280;
const s2ChartWidth = 1100;
const s2ChartPadding = 40;

export default function Home() {
  const [dateSeries, setDateSeries] = useState<AggregatedDatum[]>([]);
  const [dateCompositions, setDateCompositions] = useState<DateComposition[]>([]);
  const [s2Series, setS2Series] = useState<AggregatedDatum[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [s1Error, setS1Error] = useState<string | null>(null);
  const [s2Error, setS2Error] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ s1?: string; s2?: string }>({});
  const [analysisError, setAnalysisError] = useState<{ s1?: string; s2?: string }>({});
  const [analysisLoading, setAnalysisLoading] = useState<{ s1: boolean; s2: boolean }>({
    s1: false,
    s2: false,
  });
  const [dateHover, setDateHover] = useState<{ x: number; y: number; label: string; count: number } | null>(null);
  const [barHover, setBarHover] = useState<{
    x: number;
    y: number;
    label: string;
    count: number;
    breakdown: BreakdownDatum[];
  } | null>(null);
  const [cumulativeHover, setCumulativeHover] = useState<{
    x: number;
    y: number;
    label: string;
    count: number;
  } | null>(null);
  const [cumulativeS2Hover, setCumulativeS2Hover] = useState<{
    x: number;
    y: number;
    label: string;
    count: number;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncingS3, setSyncingS3] = useState(false);
  const [syncStatusS3, setSyncStatusS3] = useState<string | null>(null);
  const totalS1 = useMemo(
    () => dateSeries.reduce((sum, item) => sum + item.count, 0),
    [dateSeries],
  );
  const totalS2 = useMemo(
    () => s2Series.reduce((sum, item) => sum + (Number(item.count) || 0), 0),
    [s2Series],
  );
  const s1ToS2 = useMemo(() => {
    if (!totalS1) return null;
    return (totalS2 / totalS1) * 100;
  }, [totalS1, totalS2]);
  const s1MonthChange = useMemo(() => {
    if (!dateSeries.length) return null;
    const parsed = dateSeries
      .map((d) => {
        const [day, month, year] = d.label.split("/").map(Number);
        const fullYear = year >= 100 ? year : 2000 + year;
        return { count: d.count, dateObj: new Date(fullYear, (month || 1) - 1, day || 1) };
      })
      .filter((d) => !Number.isNaN(d.dateObj.getTime()));

    if (!parsed.length) return null;
    const latest = parsed.reduce((acc, curr) =>
      curr.dateObj.getTime() > acc.dateObj.getTime() ? curr : acc,
    );
    const currentMonth = latest.dateObj.getMonth();
    const currentYear = latest.dateObj.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentTotal = parsed
      .filter((d) => d.dateObj.getMonth() === currentMonth && d.dateObj.getFullYear() === currentYear)
      .reduce((sum, d) => sum + d.count, 0);
    const prevTotal = parsed
      .filter((d) => d.dateObj.getMonth() === prevMonth && d.dateObj.getFullYear() === prevYear)
      .reduce((sum, d) => sum + d.count, 0);

    if (prevTotal === 0) return null;
    const pct = ((currentTotal - prevTotal) / prevTotal) * 100;
    return Math.round(pct * 10) / 10;
  }, [dateSeries]);

  const [visibleStages, setVisibleStages] = useState<Record<StageKey, boolean>>({
    s1: true,
    s2: true,
    s3: true,
    s4: true,
    s5: true,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { maxValue, pointsByStage } = useMemo(() => {
    const max = Math.max(
      ...chartData.flatMap((d) => [d.s1, d.s2, d.s3, d.s4, d.s5]),
    );
    const xStep = (chartWidth - chartPadding * 2) / (chartData.length - 1);

    const scaleY = (value: number) => {
      const usableHeight = chartHeight - chartPadding * 1.4;
      const offset = chartPadding * 0.4;
      return chartHeight - offset - (value / max) * usableHeight;
    };

    const toPoints = (key: StageKey) =>
      chartData
        .map((d, idx) => {
          const x = chartPadding + idx * xStep;
          const y = scaleY(d[key]);
          return `${x},${y}`;
        })
        .join(" ");

    return {
      maxValue: max,
      pointsByStage: {
        s1: toPoints("s1"),
        s2: toPoints("s2"),
        s3: toPoints("s3"),
        s4: toPoints("s4"),
        s5: toPoints("s5"),
      },
    };
  }, []);

  const xStep = (chartWidth - chartPadding * 2) / (chartData.length - 1);

  const handleToggle = (key: StageKey) => {
    setVisibleStages((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { dateLinePoints, dateMax, sortedDates } = useMemo(() => {
    if (!dateSeries.length)
      return { dateLinePoints: "", dateMax: 0, sortedDates: [] as ParsedDateDatum[] };

    const parsed: ParsedDateDatum[] = dateSeries
      .map((d) => {
        const [day, month, year] = d.label.split("/").map(Number);
        const fullYear = year >= 100 ? year : 2000 + year;
        return { ...d, dateObj: new Date(fullYear, (month || 1) - 1, day || 1) };
      })
      .filter((d) => !Number.isNaN(d.dateObj.getTime()))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    const max = Math.max(...parsed.map((d) => d.count), 1);
    const step =
      parsed.length > 1
        ? (dateChartWidth - dateChartPadding * 2) / (parsed.length - 1)
        : 0;

    const scaleY = (value: number) => {
      const usableHeight = dateChartHeight - dateChartPadding * 1.6;
      const offset = dateChartPadding * 0.6;
      return dateChartHeight - offset - (value / max) * usableHeight;
    };

    const points = parsed
      .map((d, idx) => {
        const x = dateChartPadding + idx * step;
        const y = scaleY(d.count);
        return `${x},${y}`;
      })
      .join(" ");

    return { dateLinePoints: points, dateMax: max, sortedDates: parsed };
  }, [dateSeries]);

  const cumulativeSeries = useMemo(() => {
    if (!sortedDates.length) return [];
    let running = 0;
    return sortedDates.map((d) => {
      running += d.count;
      return { label: d.label, count: running };
    });
  }, [sortedDates]);

  const s2Sorted = useMemo(() => {
    if (!s2Series.length) return [];
    return [...s2Series]
      .map((d) => {
        const [day, month, year] = d.label.split("/").map(Number);
        const fullYear = year >= 100 ? year : 2000 + year;
        return { ...d, dateObj: new Date(fullYear, (month || 1) - 1, day || 1) };
      })
      .filter((d) => !Number.isNaN(d.dateObj.getTime()))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [s2Series]);

  const cumulativeS2Series = useMemo(() => {
    if (!s2Sorted.length) return [];
    let running = 0;
    return s2Sorted.map((d) => {
      running += d.count;
      return { label: d.label, count: running };
    });
  }, [s2Sorted]);
  const compositionPalette = [
    "#1f3c88",
    "#2a4fb2",
    "#0f766e",
    "#138f7a",
    "#0f5132",
    "#6b7280",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
  ];

  const compositionColors = useMemo(() => {
    const map = new Map<string, string>();
    let idx = 0;
    dateCompositions.forEach((entry) => {
      entry.breakdown.forEach((b) => {
        if (!map.has(b.label)) {
          map.set(b.label, compositionPalette[idx % compositionPalette.length]);
          idx += 1;
        }
      });
    });
    return map;
  }, [dateCompositions]);

  const compositionMap = useMemo(() => {
    const map = new Map<string, DateComposition>();
    dateCompositions.forEach((c) => map.set(c.label, c));
    return map;
  }, [dateCompositions]);
  const summaryCardsData = useMemo(
    () =>
      summaryCards.map((card) =>
        card.key === "s1"
          ? {
              ...card,
              value: totalS1 ? totalS1.toLocaleString("id-ID") : card.value,
              trend:
                s1MonthChange === null
                  ? "- vs last month"
                  : `${s1MonthChange > 0 ? "+" : ""}${s1MonthChange.toLocaleString("id-ID")}% vs last month`,
            }
          : card.key === "s2"
            ? {
                ...card,
                value: totalS2 ? totalS2.toLocaleString("id-ID") : card.value,
                conversion:
                  s1ToS2 === null
                    ? "S1 -> S2: -"
                    : `S1 -> S2: ${s1ToS2.toLocaleString("id-ID", {
                        maximumFractionDigits: 1,
                        minimumFractionDigits: 1,
                      })}%`,
              }
            : card,
      ),
    [totalS1, totalS2, s1MonthChange, s1ToS2],
  );

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch("/api/sync-user", { method: "POST" });
      if (!res.ok) throw new Error(`Sync gagal: ${res.status}`);
      const data = (await res.json()) as { status?: string; error?: string };
      if (data.status !== "success") throw new Error(data.error || "Sync gagal");
      setSyncStatus("Sinkronisasi berhasil");
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Sync gagal");
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncS3 = async () => {
    setSyncingS3(true);
    setSyncStatusS3(null);
    try {
      const res = await fetch("/api/sync-s3", { method: "POST" });
      if (!res.ok) throw new Error(`Sync gagal: ${res.status}`);
      const data = (await res.json()) as { status?: string; error?: string };
      if (data.status !== "success") throw new Error(data.error || "Sync gagal");
      setSyncStatusS3("Sync transaksi berhasil");
    } catch (error) {
      setSyncStatusS3(error instanceof Error ? error.message : "Sync gagal");
    } finally {
      setSyncingS3(false);
    }
  };

  useEffect(() => {
    const loadSeries = async () => {
      setS1Error(null);
      setS2Error(null);

      try {
        const s1Res = await fetch("/api/data-s1");
        if (!s1Res.ok) throw new Error(`S1 failed with status ${s1Res.status}`);
        const payloadS1 = (await s1Res.json()) as {
          dates: AggregatedDatum[];
          compositions: DateComposition[];
        };
        setDateSeries(payloadS1.dates);
        setDateCompositions(payloadS1.compositions);
      } catch (error) {
        setS1Error(error instanceof Error ? error.message : "Unknown error");
      }

      try {
        const s2Res = await fetch("/api/data-s2");
        if (!s2Res.ok) throw new Error(`S2 failed with status ${s2Res.status}`);
        const payloadS2 = (await s2Res.json()) as {
          dates: AggregatedDatum[];
        };
        const normalizedS2 = (payloadS2.dates || []).map((d) => ({
          label: d.label,
          count: typeof d.count === "number" ? d.count : Number(d.count) || 0,
        }));
        setS2Series(normalizedS2);
      } catch (error) {
        setS2Error(error instanceof Error ? error.message : "Unknown error");
      }

      setLoadingSeries(false);
    };
    loadSeries();
  }, []);

  const fetchAnalysis = async (source: "s1" | "s2", data: AggregatedDatum[]) => {
    if (!data.length) return;
    setAnalysisLoading((prev) => ({ ...prev, [source]: true }));
    setAnalysisError((prev) => ({ ...prev, [source]: undefined }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, data }),
      });
      if (!res.ok) throw new Error(`AI error: ${res.status}`);
      const payload = (await res.json()) as { text?: string; error?: string };
      if (!payload.text) throw new Error(payload.error || "AI response empty");
      setAnalysis((prev) => ({ ...prev, [source]: payload.text }));
    } catch (error) {
      setAnalysisError((prev) => ({
        ...prev,
        [source]: error instanceof Error ? error.message : "AI error",
      }));
    } finally {
      setAnalysisLoading((prev) => ({ ...prev, [source]: false }));
    }
  };

  useEffect(() => {
    if (!s1Error && dateSeries.length) {
      fetchAnalysis("s1", dateSeries);
    }
  }, [dateSeries, s1Error]);

  useEffect(() => {
    if (!s2Error && s2Series.length) {
      fetchAnalysis("s2", s2Series);
    }
  }, [s2Series, s2Error]);

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-[#0f172a]">
              MWX Growth Journey - Daily Accumulative Funnel
            </h1>
            <p className="text-sm text-zinc-600">
              Tracking UMKM adoption from database entry to purchase
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400">
              07 Nov 2025 - 07 Dec 2025
            </button>
            <button className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-[#1f3c88] shadow-sm transition hover:border-[#1f3c88]">
              Export CSV / PNG
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                syncing
                  ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                  : "border-[#1f3c88] bg-[#1f3c88] text-white hover:bg-[#2a4fb2]"
              }`}
            >
              {syncing ? "Syncing..." : "Sync User"}
            </button>
            <button
              onClick={handleSyncS3}
              disabled={syncingS3}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition ${
                syncingS3
                  ? "border-zinc-200 bg-zinc-100 text-zinc-500"
                  : "border-[#0f766e] bg-[#0f766e] text-white hover:bg-[#138f7a]"
              }`}
            >
              {syncingS3 ? "Syncing..." : "Sync Transaksi"}
            </button>
          </div>
        </header>
        {syncStatus && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
            {syncStatus}
          </div>
        )}
        {syncStatusS3 && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
            {syncStatusS3}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summaryCardsData.map((card) => (
            <div
              key={card.key}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-zinc-500">{card.label}</p>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stagePalette[card.key] }}
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#0f172a]">{card.value}</p>
              <p className="text-xs font-medium text-zinc-600">{card.trend}</p>
              <p className="mt-2 text-sm text-zinc-500">{card.conversion}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">S2 Source</p>
                <h3 className="text-lg font-semibold text-[#0f172a]">Line Chart Per Tanggal</h3>
              </div>
              <span className="text-xs text-zinc-500">Jumlah user</span>
            </div>
            <div className="mt-4">
              {loadingSeries ? (
                <p className="text-sm text-zinc-500">Memuat data...</p>
              ) : s2Error ? (
                <p className="text-sm text-red-600">Gagal memuat: {s2Error}</p>
              ) : !s2Sorted.length ? (
                <p className="text-sm text-zinc-500">Data belum tersedia.</p>
              ) : (
                <div className="relative overflow-hidden rounded-lg border border-zinc-100 bg-[#f9fafb]">
                  <svg
                    viewBox={`0 0 ${s2ChartWidth} ${s2ChartHeight}`}
                    role="img"
                    aria-label="S2 per tanggal"
                  >
                    {[0.25, 0.5, 0.75, 1].map((fraction, idx) => {
                      const y =
                        s2ChartHeight -
                        s2ChartPadding * 0.4 -
                        fraction * (s2ChartHeight - s2ChartPadding * 1.6);
                      return (
                        <line
                          key={idx}
                          x1={s2ChartPadding}
                          x2={s2ChartWidth - s2ChartPadding}
                          y1={y}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />
                      );
                    })}
                    <line
                      x1={s2ChartPadding}
                      x2={s2ChartPadding}
                      y1={s2ChartPadding * 0.6}
                      y2={s2ChartHeight - s2ChartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    <line
                      x1={s2ChartPadding}
                      x2={s2ChartWidth - s2ChartPadding}
                      y1={s2ChartHeight - s2ChartPadding * 0.4}
                      y2={s2ChartHeight - s2ChartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    {(() => {
                      const maxVal = Math.max(...s2Sorted.map((d) => d.count), 1);
                      const step =
                        s2Sorted.length > 1
                          ? (s2ChartWidth - s2ChartPadding * 2) / (s2Sorted.length - 1)
                          : 0;
                      const scaleY = (value: number) => {
                        const usableHeight = s2ChartHeight - s2ChartPadding * 1.6;
                        const offset = s2ChartPadding * 0.4;
                        return s2ChartHeight - offset - (value / maxVal) * usableHeight;
                      };
                      const points = s2Sorted
                        .map((d, idx) => {
                          const x = s2ChartPadding + idx * step;
                          const y = scaleY(d.count);
                          return `${x},${y}`;
                        })
                        .join(" ");
                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke={stagePalette.s2}
                            strokeWidth={3}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={points}
                          />
                          {s2Sorted.map((d, idx) => {
                            const x = s2ChartPadding + idx * step;
                            const y = scaleY(d.count);
                            return (
                              <circle
                                key={`${d.label}-${idx}`}
                                cx={x}
                                cy={y}
                                r={3.5}
                                fill="#fff"
                                stroke={stagePalette.s2}
                                strokeWidth={2}
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="pointer-events-none absolute bottom-2 left-[40px] right-[40px] flex justify-between text-xs text-zinc-500">
                    {s2Sorted.map((d) => (
                      <span key={d.label}>{d.label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">S2 Source</p>
                <h3 className="text-lg font-semibold text-[#0f172a]">Akumulasi Per Tanggal</h3>
              </div>
              <span className="text-xs text-zinc-500">Cumulative</span>
            </div>
            <div className="mt-4">
              {loadingSeries ? (
                <p className="text-sm text-zinc-500">Memuat data...</p>
              ) : s2Error ? (
                <p className="text-sm text-red-600">Gagal memuat: {s2Error}</p>
              ) : !cumulativeS2Series.length ? (
                <p className="text-sm text-zinc-500">Data belum tersedia.</p>
              ) : (
                <div className="relative overflow-hidden rounded-lg border border-zinc-100 bg-[#f9fafb]">
                  <svg
                    viewBox={`0 0 ${s2ChartWidth} ${s2ChartHeight}`}
                    role="img"
                    aria-label="Akumulasi S2 per tanggal"
                    onMouseLeave={() => setCumulativeS2Hover(null)}
                  >
                    {[0.25, 0.5, 0.75, 1].map((fraction, idx) => {
                      const y =
                        s2ChartHeight -
                        s2ChartPadding * 0.4 -
                        fraction * (s2ChartHeight - s2ChartPadding * 1.6);
                      return (
                        <line
                          key={idx}
                          x1={s2ChartPadding}
                          x2={s2ChartWidth - s2ChartPadding}
                          y1={y}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />
                      );
                    })}
                    <line
                      x1={s2ChartPadding}
                      x2={s2ChartPadding}
                      y1={s2ChartPadding * 0.6}
                      y2={s2ChartHeight - s2ChartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    <line
                      x1={s2ChartPadding}
                      x2={s2ChartWidth - s2ChartPadding}
                      y1={s2ChartHeight - s2ChartPadding * 0.4}
                      y2={s2ChartHeight - s2ChartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    {(() => {
                      const maxVal = cumulativeS2Series[cumulativeS2Series.length - 1].count;
                      const step =
                        cumulativeS2Series.length > 1
                          ? (s2ChartWidth - s2ChartPadding * 2) /
                            (cumulativeS2Series.length - 1)
                          : 0;
                      const scaleY = (value: number) => {
                        const usableHeight = s2ChartHeight - s2ChartPadding * 1.6;
                        const offset = s2ChartPadding * 0.4;
                        return s2ChartHeight - offset - (value / maxVal) * usableHeight;
                      };
                      const points = cumulativeS2Series
                        .map((d, idx) => {
                          const x = s2ChartPadding + idx * step;
                          const y = scaleY(d.count);
                          return `${x},${y}`;
                        })
                        .join(" ");
                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke={stagePalette.s2}
                            strokeWidth={3}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={points}
                          />
                          {cumulativeS2Series.map((d, idx) => {
                            const x = s2ChartPadding + idx * step;
                            const y = scaleY(d.count);
                            return (
                              <circle
                                key={`${d.label}-${idx}`}
                                cx={x}
                                cy={y}
                                r={3.5}
                                fill="#fff"
                                stroke={stagePalette.s2}
                                strokeWidth={2}
                                onMouseEnter={() =>
                                  setCumulativeS2Hover({
                                    x,
                                    y,
                                    label: d.label,
                                    count: d.count,
                                  })
                                }
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="pointer-events-none absolute bottom-2 left-[40px] right-[40px] flex justify-between text-xs text-zinc-500">
                    {cumulativeS2Series.map((d) => (
                      <span key={d.label}>{d.label}</span>
                    ))}
                  </div>
                  {cumulativeS2Hover && (
                    <div
                      className="pointer-events-none absolute rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-md"
                      style={{
                        left: Math.min(Math.max(cumulativeS2Hover.x - 60, 8), s2ChartWidth - 140),
                        top: Math.max(cumulativeS2Hover.y - 52, 8),
                      }}
                    >
                      <p className="font-semibold text-[#2a4fb2]">{cumulativeS2Hover.label}</p>
                      <p className="text-sm text-zinc-700">
                        {cumulativeS2Hover.count.toLocaleString("id-ID")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">S2 Source</p>
                <h3 className="text-lg font-semibold text-[#0f172a]">AI Insight</h3>
              </div>
              <span className="text-xs text-zinc-500">OpenRouter</span>
            </div>
            <div className="mt-3 text-sm text-zinc-700">
              {analysisLoading.s2 ? (
                <p>Meminta analisis AI...</p>
              ) : analysisError.s2 ? (
                <p className="text-red-600">Gagal analisis: {analysisError.s2}</p>
              ) : analysis.s2 ? (
                <p>{analysis.s2}</p>
              ) : (
                <p className="text-zinc-500">Menunggu data S2 untuk dianalisis.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">S1 Source</p>
                <h3 className="text-lg font-semibold text-[#0f172a]">AI Insight</h3>
              </div>
              <span className="text-xs text-zinc-500">OpenRouter</span>
            </div>
            <div className="mt-3 text-sm text-zinc-700">
              {analysisLoading.s1 ? (
                <p>Meminta analisis AI...</p>
              ) : analysisError.s1 ? (
                <p className="text-red-600">Gagal analisis: {analysisError.s1}</p>
              ) : analysis.s1 ? (
                <p>{analysis.s1}</p>
              ) : (
                <p className="text-zinc-500">Menunggu data S1 untuk dianalisis.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">S1 Source</p>
                <h3 className="text-lg font-semibold text-[#0f172a]">Bar Chart Per Tanggal</h3>
              </div>
              <span className="text-xs text-zinc-500">Jumlah user</span>
            </div>
            <div className="mt-4">
              {loadingSeries ? (
                <p className="text-sm text-zinc-500">Memuat data...</p>
              ) : s1Error ? (
                <p className="text-sm text-red-600">Gagal memuat: {s1Error}</p>
              ) : !sortedDates.length ? (
                <p className="text-sm text-zinc-500">Data belum tersedia.</p>
              ) : (
                <div className="relative overflow-hidden rounded-lg border border-zinc-100 bg-[#f9fafb]">
                  <svg
                    viewBox={`0 0 ${barChartWidth} ${barChartHeight}`}
                    role="img"
                    aria-label="Bar chart per tanggal input data"
                    onMouseLeave={() => setBarHover(null)}
                  >
                    {[0.25, 0.5, 0.75, 1].map((fraction, idx) => {
                      const y =
                        barChartHeight -
                        barChartPadding * 0.6 -
                        fraction * (barChartHeight - barChartPadding * 1.6);
                      return (
                        <line
                          key={idx}
                          x1={barChartPadding}
                          x2={barChartWidth - barChartPadding}
                          y1={y}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />
                      );
                    })}
                    <line
                      x1={barChartPadding}
                      x2={barChartPadding}
                      y1={barChartPadding * 0.6}
                      y2={barChartHeight - barChartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    <line
                      x1={barChartPadding}
                      x2={barChartWidth - barChartPadding}
                      y1={barChartHeight - barChartPadding * 0.4}
                      y2={barChartHeight - barChartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    {sortedDates.map((d, idx) => {
                      const step =
                        sortedDates.length > 1
                          ? (barChartWidth - barChartPadding * 2) / (sortedDates.length - 1)
                          : 0;
                      const barWidth = Math.max(Math.min(step * 0.6 || 24, 48), 12);
                      const x = barChartPadding + idx * step - barWidth / 2;
                      const baseY = barChartHeight - barChartPadding * 0.4;
                      const comp = compositionMap.get(d.label);
                      const breakdown = comp?.breakdown ?? [{ label: "Total", count: d.count }];
                      const total = comp?.count ?? d.count;
                      let accumulated = 0;
                      return (
                        <g key={d.label}>
                          {breakdown.map((segment) => {
                            const segHeight =
                              (segment.count / Math.max(dateMax, 1)) *
                              (barChartHeight - barChartPadding * 1.6);
                            const y = baseY - accumulated - segHeight;
                            accumulated += segHeight;
                            const color =
                              compositionColors.get(segment.label) ?? stagePalette.s1;
                            return (
                              <rect
                                key={`${d.label}-${segment.label}`}
                                x={x}
                                y={y}
                                width={barWidth}
                                height={segHeight}
                                rx={3}
                                fill={color}
                                className="transition-all duration-150"
                                onMouseEnter={() =>
                                  setBarHover({
                                    x: x + barWidth / 2,
                                    y,
                                    label: d.label,
                                    count: total,
                                    breakdown,
                                  })
                                }
                              />
                            );
                          })}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="pointer-events-none absolute bottom-2 left-[56px] right-[56px] flex justify-between text-xs text-zinc-500">
                    {sortedDates.map((d) => (
                      <span key={d.label}>{d.label}</span>
                    ))}
                  </div>
                  {barHover && (
                    <div
                      className="pointer-events-none absolute rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-md"
                      style={{
                        left: Math.min(Math.max(barHover.x - 80, 8), barChartWidth - 200),
                        top: Math.max(barHover.y - 52, 8),
                      }}
                    >
                      <p className="font-semibold text-[#1f3c88]">{barHover.label}</p>
                      <p className="text-sm text-zinc-700 mb-1">
                        Total: {barHover.count.toLocaleString("id-ID")}
                      </p>
                      <div className="space-y-0.5">
                        {barHover.breakdown.map((segment) => (
                          <div key={segment.label} className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  compositionColors.get(segment.label) ?? stagePalette.s1,
                              }}
                            />
                            <span className="text-[11px] text-zinc-700">
                              {segment.label}: {segment.count.toLocaleString("id-ID")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">S1 Source</p>
                <h3 className="text-lg font-semibold text-[#0f172a]">Akumulasi Per Tanggal</h3>
              </div>
              <span className="text-xs text-zinc-500">Cumulative</span>
            </div>
            <div className="mt-4">
              {loadingSeries ? (
                <p className="text-sm text-zinc-500">Memuat data...</p>
              ) : s1Error ? (
                <p className="text-sm text-red-600">Gagal memuat: {s1Error}</p>
              ) : !cumulativeSeries.length ? (
                <p className="text-sm text-zinc-500">Data belum tersedia.</p>
              ) : (
                <div className="relative overflow-hidden rounded-lg border border-zinc-100 bg-[#f9fafb]">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    role="img"
                    aria-label="Akumulasi S1 per tanggal"
                    onMouseLeave={() => setCumulativeHover(null)}
                  >
                    {[0.25, 0.5, 0.75, 1].map((fraction, idx) => {
                      const y =
                        chartHeight -
                        chartPadding * 0.4 -
                        fraction * (chartHeight - chartPadding * 1.4);
                      return (
                        <line
                          key={idx}
                          x1={chartPadding}
                          x2={chartWidth - chartPadding}
                          y1={y}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />
                      );
                    })}
                    <line
                      x1={chartPadding}
                      x2={chartPadding}
                      y1={chartPadding * 0.6}
                      y2={chartHeight - chartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    <line
                      x1={chartPadding}
                      x2={chartWidth - chartPadding}
                      y1={chartHeight - chartPadding * 0.4}
                      y2={chartHeight - chartPadding * 0.4}
                      stroke="#d1d5db"
                      strokeWidth={1}
                    />
                    {(() => {
                      const maxVal = cumulativeSeries[cumulativeSeries.length - 1].count;
                      const step =
                        cumulativeSeries.length > 1
                          ? (chartWidth - chartPadding * 2) / (cumulativeSeries.length - 1)
                          : 0;
                      const scaleY = (value: number) => {
                        const usableHeight = chartHeight - chartPadding * 1.4;
                        const offset = chartPadding * 0.4;
                        return chartHeight - offset - (value / maxVal) * usableHeight;
                      };
                      const points = cumulativeSeries
                        .map((d, idx) => {
                          const x = chartPadding + idx * step;
                          const y = scaleY(d.count);
                          return `${x},${y}`;
                        })
                        .join(" ");
                      return (
                        <>
                          <polyline
                            fill="none"
                            stroke={stagePalette.s1}
                            strokeWidth={3}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={points}
                          />
                          {cumulativeSeries.map((d, idx) => {
                            const x = chartPadding + idx * step;
                            const y = scaleY(d.count);
                            return (
                              <circle
                                key={`${d.label}-${idx}`}
                                cx={x}
                                cy={y}
                                r={3.5}
                                fill="#fff"
                                stroke={stagePalette.s1}
                                strokeWidth={2}
                                onMouseEnter={() =>
                                  setCumulativeHover({
                                    x,
                                    y,
                                    label: d.label,
                                    count: d.count,
                                  })
                                }
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="pointer-events-none absolute bottom-2 left-[48px] right-[48px] flex justify-between text-xs text-zinc-500">
                    {cumulativeSeries.map((d) => (
                      <span key={d.label}>{d.label}</span>
                    ))}
                  </div>
                  {cumulativeHover && (
                    <div
                      className="pointer-events-none absolute rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-md"
                      style={{
                        left: Math.min(Math.max(cumulativeHover.x - 60, 8), chartWidth - 140),
                        top: Math.max(cumulativeHover.y - 52, 8),
                      }}
                    >
                      <p className="font-semibold text-[#1f3c88]">{cumulativeHover.label}</p>
                      <p className="text-sm text-zinc-700">
                        {cumulativeHover.count.toLocaleString("id-ID")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">Cumulative Users</p>
                <h2 className="text-lg font-semibold text-[#0f172a]">
                  Multi-stage growth lines (S1-S5)
                </h2>
              </div>
              <div className="flex flex-wrap justify-end gap-3 text-sm">
                {summaryCards.map((card) => (
                  <button
                    key={card.key}
                    onClick={() => handleToggle(card.key as StageKey)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 transition ${
                      visibleStages[card.key as StageKey]
                        ? "border-zinc-300 bg-zinc-50 text-zinc-800"
                        : "border-dashed border-zinc-300 bg-white text-zinc-400"
                    }`}
                    type="button"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stagePalette[card.key as StageKey] }}
                    />
                    <span className="text-xs font-medium">{card.key.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-lg border border-zinc-100 bg-[#f9fafb]">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Cumulative users by stage over time"
                onMouseLeave={() => setHoverIndex(null)}
                onMouseMove={(event) => {
                  const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
                  const x = event.clientX - rect.left - chartPadding;
                  const ratio = x / (chartWidth - chartPadding * 2);
                  const idx = Math.round(ratio * (chartData.length - 1));
                  const bounded = Math.min(Math.max(idx, 0), chartData.length - 1);
                  setHoverIndex(bounded);
                }}
              >
                {[0.2, 0.4, 0.6, 0.8, 1].map((fraction, idx) => {
                  const y =
                    chartHeight -
                    chartPadding * 0.4 -
                    (maxValue * fraction) / maxValue * (chartHeight - chartPadding * 1.4);
                  return (
                    <line
                      key={idx}
                      x1={chartPadding}
                      x2={chartWidth - chartPadding}
                      y1={y}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                      strokeDasharray="3 4"
                    />
                  );
                })}

                <line
                  x1={chartPadding}
                  x2={chartPadding}
                  y1={chartPadding * 0.6}
                  y2={chartHeight - chartPadding * 0.4}
                  stroke="#d1d5db"
                  strokeWidth={1}
                />
                <line
                  x1={chartPadding}
                  x2={chartWidth - chartPadding}
                  y1={chartHeight - chartPadding * 0.4}
                  y2={chartHeight - chartPadding * 0.4}
                  stroke="#d1d5db"
                  strokeWidth={1}
                />

                {summaryCards.map((card) => {
                  const key = card.key as StageKey;
                  if (!visibleStages[key]) return null;
                  const strokeWidth =
                    key === "s5" ? 2.5 : key === "s1" || key === "s2" ? 3 : 2.8;
                  return (
                    <polyline
                      key={key}
                      fill="none"
                      stroke={stagePalette[key]}
                      strokeWidth={strokeWidth}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={pointsByStage[key]}
                    />
                  );
                })}

                {hoverIndex !== null && (
                  <line
                    x1={chartPadding + hoverIndex! * xStep}
                    x2={chartPadding + hoverIndex! * xStep}
                    y1={chartPadding * 0.6}
                    y2={chartHeight - chartPadding * 0.4}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                )}
              </svg>

              <div className="pointer-events-none absolute left-0 top-0 h-full w-full" aria-hidden>
                <div className="absolute bottom-2 left-[48px] right-[48px] flex justify-between text-xs text-zinc-500">
                  {chartData.map((d, idx) => (
                    <span key={idx}>{d.date}</span>
                  ))}
                </div>
              </div>

              {hoverIndex !== null && (
                <div
                  className="pointer-events-none absolute top-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs shadow-md"
                  style={{
                    left: Math.min(
                      Math.max(chartPadding + hoverIndex! * xStep - 90, 8),
                      chartWidth - 200,
                    ),
                  }}
                >
                  <p className="text-[11px] font-semibold text-zinc-500">
                    {chartData[hoverIndex!].date}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    {summaryCards.map((card) => {
                      const key = card.key as StageKey;
                      if (!visibleStages[key]) return null;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: stagePalette[key] }}
                          />
                          <div className="flex items-baseline gap-1">
                            <span className="text-[11px] font-semibold text-zinc-700">
                              {key.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-zinc-600">
                              {chartData[hoverIndex!][key]}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-zinc-500">Insights</p>
              <h3 className="text-lg font-semibold text-[#0f172a]">
                MWX Growth Journey - Daily Accumulative Funnel
              </h3>
              <p className="text-sm text-zinc-600">
                Ringkasan otomatis untuk pembaruan manajemen dan tim partnership.
              </p>
            </div>
            <div className="space-y-3 rounded-lg border border-zinc-100 bg-[#f9fafb] px-4 py-3">
              <div className="flex gap-3">
                <div className="mt-1 h-8 w-8 rounded-full bg-[#e3e8f0]" />
                <div>
                  <p className="text-sm font-semibold text-[#1f3c88]">Strong activation momentum</p>
                  <p className="text-sm text-zinc-600">
                    Perpindahan S2 {'->'} S3 konsisten tinggi; pertimbangkan scale campaign onboarding.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-8 w-8 rounded-full bg-[#d9f2eb]" />
                <div>
                  <p className="text-sm font-semibold text-[#0f766e]">Habit formation stable</p>
                  <p className="text-sm text-zinc-600">
                    S4 tumbuh mantap; jaga cadence edukasi fitur rutin agar tidak drop.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-8 w-8 rounded-full bg-[#e6f0e8]" />
                <div>
                  <p className="text-sm font-semibold text-[#0f5132]">Paid conversion early</p>
                  <p className="text-sm text-zinc-600">
                    S5 masih tahap awal; mapping cohort siap konversi untuk eksperimen pricing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-zinc-500">S1 Source</p>
                <h3 className="text-lg font-semibold text-[#0f172a]">Per Tanggal Input Data</h3>
              </div>
              <span className="text-xs text-zinc-500">Daily totals</span>
            </div>
            <div className="mt-4">
              {loadingSeries ? (
                <p className="text-sm text-zinc-500">Memuat data...</p>
              ) : s1Error ? (
                <p className="text-sm text-red-600">Gagal memuat: {s1Error}</p>
              ) : !dateSeries.length ? (
                <p className="text-sm text-zinc-500">Data belum tersedia.</p>
              ) : (
                <div className="relative overflow-hidden rounded-lg border border-zinc-100 bg-[#f9fafb]">
                  <svg
                    viewBox={`0 0 ${dateChartWidth} ${dateChartHeight}`}
                    role="img"
                    aria-label="S1 per tanggal input data"
                    onMouseLeave={() => setDateHover(null)}
                  >
                    {[0.25, 0.5, 0.75, 1].map((fraction, idx) => {
                      const y =
                        dateChartHeight -
                        dateChartPadding * 0.6 -
                        fraction * (dateChartHeight - dateChartPadding * 1.6);
                      return (
                        <line
                          key={idx}
                          x1={dateChartPadding}
                          x2={dateChartWidth - dateChartPadding}
                          y1={y}
                          y2={y}
                          stroke="#e5e7eb"
                          strokeWidth={1}
                          strokeDasharray="3 4"
                        />
                      );
                    })}
                    <polyline
                      fill="none"
                      stroke={stagePalette.s1}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={dateLinePoints}
                    />
                    {sortedDates.map((d, idx) => {
                      const step =
                        sortedDates.length > 1
                          ? (dateChartWidth - dateChartPadding * 2) /
                            (sortedDates.length - 1)
                          : 0;
                      const x = dateChartPadding + idx * step;
                      const y =
                        dateChartHeight -
                        dateChartPadding * 0.6 -
                        (d.count / Math.max(dateMax, 1)) *
                          (dateChartHeight - dateChartPadding * 1.6);
                      return (
                        <circle
                          key={`${d.label}-${idx}`}
                          cx={x}
                          cy={y}
                          r={3.5}
                          fill="#fff"
                          stroke={stagePalette.s1}
                          strokeWidth={2}
                          onMouseEnter={() =>
                            setDateHover({
                              x,
                              y,
                              label: d.label,
                              count: d.count,
                            })
                          }
                        />
                      );
                    })}
                  </svg>
                  <div className="pointer-events-none absolute bottom-2 left-[40px] right-[40px] flex justify-between text-xs text-zinc-500">
                    {sortedDates.map((d) => (
                      <span key={d.label}>{d.label}</span>
                    ))}
                  </div>
                  {dateHover && (
                    <div
                      className="pointer-events-none absolute rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-md"
                      style={{
                        left: Math.min(Math.max(dateHover!.x - 60, 8), dateChartWidth - 140),
                        top: Math.max(dateHover!.y - 52, 8),
                      }}
                    >
                      <p className="font-semibold text-[#1f3c88]">{dateHover!.label}</p>
                      <p className="text-sm text-zinc-700">{dateHover!.count.toLocaleString("id-ID")}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">
          All metrics are cumulative and represent unique UMKM progression across stages.
        </footer>
      </div>
    </main>
  );
}
