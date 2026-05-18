"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type Event = {
  id: string;
  name: string;
  event_date: string;
};

type QuestionAnswer = {
  question_id: string;
  question_text: string;
  section: string;
  section_order: number;
  order_index: number;
  answer_value: string;
};

type RegistrationWithAnswers = {
  registration_id: string;
  full_name: string;
  email: string;
  business_name: string;
  registered_at: string;
  status: string;
  answers: QuestionAnswer[];
};

type ComparisonData = {
  registrations: RegistrationWithAnswers[];
  questions: {
    id: string;
    section: string;
    section_order: number;
    order_index: number;
    question_text: string;
  }[];
};

export default function EventAnswersPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("all");

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventRes, answersRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/answers`),
      ]);

      const eventData = await eventRes.json();
      const answersData = await answersRes.json();

      if (!eventRes.ok) throw new Error(eventData.error || "Gagal mengambil data event");

      setEvent(eventData.event);
      setData(answersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const getAnswerForQuestion = (registration: RegistrationWithAnswers, questionId: string): string => {
    const answer = registration.answers.find((a) => a.question_id === questionId);
    return answer?.answer_value || "-";
  };

  const getUniqueAnswers = (questionId: string): string[] => {
    if (!data) return [];
    const answers = data.registrations
      .flatMap((r) => r.answers)
      .filter((a) => a.question_id === questionId && a.answer_value)
      .map((a) => a.answer_value);

    return [...new Set(answers)] as string[];
  };

  const getSectionColor = (section: string): string => {
    const colors: Record<string, string> = {
      "Kapasitas Bayar": "bg-orange-100 border-orange-300",
      "Motivasi Berkembang": "bg-blue-100 border-blue-300",
      "Kesiapan Digital": "bg-green-100 border-green-300",
    };
    return colors[section] || "bg-gray-100 border-gray-300";
  };

  const getSectionIcon = (section: string): string => {
    const icons: Record<string, string> = {
      "Kapasitas Bayar": "💰",
      "Motivasi Berkembang": "📈",
      "Kesiapan Digital": "📱",
    };
    return icons[section] || "📋";
  };

  const sections = data?.questions
    ? [...new Set(data.questions.map((q) => q.section))]
    : [];

  const filteredQuestions = data?.questions
    ? selectedSection === "all"
      ? data.questions
      : data.questions.filter((q) => q.section === selectedSection)
    : [];

  const exportToCSV = () => {
    if (!data) return;

    const headers = ["No", "Nama", "Email", "Usaha", ...filteredQuestions.map((q) => q.question_text)];
    const rows = data.registrations.map((reg, idx) => [
      idx + 1,
      reg.full_name,
      reg.email,
      reg.business_name || "-",
      ...filteredQuestions.map((q) => getAnswerForQuestion(reg, q.id)),
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${event?.name || "event"}-kuesioner.csv`;
    link.click();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="px-6 py-10 lg:px-10">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-bold text-red-600">{error || "Data tidak ditemukan"}</p>
          </div>
          <Link href={`/events/${eventId}`} className="mt-4 inline-block text-orange-600 hover:underline">
            ← Kembali ke Detail Event
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/events/${eventId}`}
              className="text-sm font-bold text-slate-500 transition hover:text-slate-900"
            >
              ← Kembali ke Detail Event
            </Link>
            <button
              onClick={exportToCSV}
              disabled={!data || data.registrations.length === 0}
              className="rounded-lg border-2 border-slate-900 bg-orange-600 px-4 py-2 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition hover:bg-orange-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
              Perbandingan Jawaban
            </p>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 lg:text-3xl">
              {event.name}
            </h1>
          </div>
        </header>

        {!data || data.registrations.length === 0 ? (
          <div className="rounded-xl border-2 border-slate-900 bg-white p-12 text-center shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
            <div className="mb-4 text-5xl">📋</div>
            <h2 className="mb-2 text-xl font-black uppercase text-slate-900">
              Belum Ada Data
            </h2>
            <p className="text-sm text-slate-500">
              Belum ada peserta yang terdaftar atau mengisi kuesioner
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Total Peserta
                </p>
                <p className="mt-1 text-3xl font-black text-slate-900">
                  {data.registrations.length}
                </p>
              </div>
              <div className="rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Total Pertanyaan
                </p>
                <p className="mt-1 text-3xl font-black text-slate-900">
                  {data.questions.length}
                </p>
              </div>
              <div className="rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sudah Isi Kuesioner
                </p>
                <p className="mt-1 text-3xl font-black text-green-600">
                  {data.registrations.filter((r) => r.answers.length > 0).length}
                </p>
              </div>
              <div className="rounded-xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Belum Isi Kuesioner
                </p>
                <p className="mt-1 text-3xl font-black text-red-600">
                  {data.registrations.filter((r) => r.answers.length === 0).length}
                </p>
              </div>
            </div>

            {/* Section Filter */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSection("all")}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-black uppercase tracking-widest transition ${
                  selectedSection === "all"
                    ? "border-slate-900 bg-slate-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                }`}
              >
                Semua
              </button>
              {sections.map((section) => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-black uppercase tracking-widest transition ${
                    selectedSection === section
                      ? "border-slate-900 bg-orange-600 text-white shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  {getSectionIcon(section)} {section}
                </button>
              ))}
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-xl border-2 border-slate-900 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="sticky left-0 z-10 border-r-2 border-slate-700 px-4 py-3 text-left font-black uppercase tracking-wider">
                      #
                    </th>
                    <th className="sticky left-12 z-10 border-r-2 border-slate-700 px-4 py-3 text-left font-black uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="sticky left-48 z-10 border-r-2 border-slate-700 px-4 py-3 text-left font-black uppercase tracking-wider">
                      Email
                    </th>
                    {filteredQuestions.map((q, idx) => (
                      <th
                        key={q.id}
                        className={`border-r border-slate-700 px-3 py-3 text-left font-black uppercase tracking-wider ${getSectionColor(
                          q.section
                        )}`}
                      >
                        <div className="mb-1">
                          {getSectionIcon(q.section)} Q{idx + 1}
                        </div>
                        <div className="max-w-[200px] text-[10px] leading-tight text-slate-600">
                          {q.question_text.length > 50
                            ? q.question_text.substring(0, 50) + "..."
                            : q.question_text}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.registrations.map((reg, regIdx) => (
                    <tr
                      key={reg.registration_id}
                      className={`border-b border-slate-200 transition ${
                        regIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                      } hover:bg-orange-50`}
                    >
                      <td className="sticky left-0 z-10 border-r-2 border-slate-300 bg-slate-100 px-4 py-3 font-black text-slate-700">
                        {regIdx + 1}
                      </td>
                      <td className="sticky left-12 z-10 border-r-2 border-slate-300 bg-inherit px-4 py-3 font-bold text-slate-900">
                        <div>{reg.full_name}</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          {reg.business_name || "-"}
                        </div>
                      </td>
                      <td className="sticky left-48 z-10 border-r-2 border-slate-300 bg-inherit px-4 py-3 font-medium text-slate-600">
                        {reg.email}
                      </td>
                      {filteredQuestions.map((q) => {
                        const answer = getAnswerForQuestion(reg, q.id);
                        const uniqueAnswers = getUniqueAnswers(q.id);
                        const isFirst = uniqueAnswers[0] === answer;

                        return (
                          <td
                            key={q.id}
                            className={`border-r border-slate-200 px-3 py-3 ${
                              answer === "-"
                                ? "bg-red-50 text-red-400"
                                : isFirst && uniqueAnswers.length > 1
                                ? "bg-green-50"
                                : ""
                            }`}
                          >
                            <span className="text-xs">
                              {answer.length > 30 ? answer.substring(0, 30) + "..." : answer}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border-2 border-slate-300 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-green-50 border border-slate-300"></div>
                <span className="text-xs font-medium text-slate-600">Jawaban mayoritas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-red-50 border border-slate-300"></div>
                <span className="text-xs font-medium text-slate-600">Belum menjawab</span>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
