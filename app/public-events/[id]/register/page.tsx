"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

type PublicEvent = {
  id: string;
  name: string;
  event_date: string;
  location: string;
  event_type: string;
  is_registration_open: boolean;
};

type EventQuestion = {
  id: string;
  section: string;
  section_order: number;
  order_index: number;
  question_text: string;
  question_type: "single_choice" | "multiple_choice";
  options: string[];
  is_required: boolean;
};

type Section = {
  title: string;
  icon: string;
  questions: EventQuestion[];
};

type FormData = {
  full_name: string;
  phone_number: string;
  email: string;
  business_name: string;
  questionnaire_answers: { question_id: string; answer_value: string }[];
};

type FormErrors = {
  full_name?: string;
  phone_number?: string;
  email?: string;
  general?: string;
  questionnaire?: string;
};

type EmailCheckResult = {
  exists_in_customers: boolean;
  customer_guid?: string;
  already_registered: boolean;
  existing_registration?: {
    id: string;
    full_name: string;
    phone_number?: string;
    business_name?: string;
  };
  has_questionnaire_answers: boolean;
};

export default function RegisterEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEmailDialog, setShowEmailDialog] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const [emailInput, setEmailInput] = useState("");
  const [emailCheckStatus, setEmailCheckStatus] = useState<"idle" | "checking" | "found" | "not_found" | "already_registered">("idle");
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResult | null>(null);
  const [needsQuestionnaire, setNeedsQuestionnaire] = useState(false);
  const [isNotUmkm, setIsNotUmkm] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    phone_number: "",
    email: "",
    business_name: "",
    questionnaire_answers: [],
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventRes, questionsRes] = await Promise.all([
        fetch(`/api/events-public/${eventId}`),
        fetch(`/api/events/questions?eventId=${eventId}`),
      ]);

      const eventData = await eventRes.json();
      const questionsData = await questionsRes.json();

      if (!eventRes.ok) throw new Error(eventData.error || "Gagal mengambil data event");

      setEvent(eventData.event);
      setQuestions(questionsData.questions || []);

      if (eventData.event && !eventData.event.is_registration_open) {
        router.push(`/public-events/${eventId}`);
        return;
      }

      const groupedSections = groupQuestionsBySection(questionsData.questions || []);
      setSections(groupedSections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const groupQuestionsBySection = (qs: EventQuestion[]): Section[] => {
    const sectionMap = new Map<string, EventQuestion[]>();
    for (const q of qs) {
      const existing = sectionMap.get(q.section) || [];
      existing.push(q);
      sectionMap.set(q.section, existing);
    }

    const sectionOrder = ["Status UMKM", "Masalah Terbesar", "Kapasitas Bayar", "Motivasi Berkembang", "Kesiapan Digital"];
    return sectionOrder
      .filter((s) => sectionMap.has(s))
      .map((s) => ({
        title: s,
        icon: getSectionIcon(s),
        questions: sectionMap.get(s) || [],
      }));
  };

  const getSectionIcon = (section: string): string => {
    const icons: Record<string, string> = {
      "Status UMKM": "🏢",
      "Masalah Terbesar": "⚠️",
      "Kapasitas Bayar": "💰",
      "Motivasi Berkembang": "📈",
      "Kesiapan Digital": "📱",
    };
    return icons[section] || "📋";
  };

  const checkEmail = async () => {
    if (!emailInput || !emailInput.includes("@")) {
      return;
    }

    setEmailCheckStatus("checking");

    try {
      const response = await fetch(
        `/api/check-email?email=${encodeURIComponent(emailInput)}&eventId=${eventId}`
      );
      const data: EmailCheckResult = await response.json();

      setEmailCheckResult(data);

      if (data.already_registered) {
        setEmailCheckStatus("already_registered");
      } else if (data.exists_in_customers && data.has_questionnaire_answers) {
        setEmailCheckStatus("found");
        setNeedsQuestionnaire(false);
      } else {
        setEmailCheckStatus(data.exists_in_customers ? "found" : "not_found");
        setNeedsQuestionnaire(true);
      }
    } catch (err) {
      setEmailCheckStatus("idle");
    }
  };

  const proceedAfterEmailCheck = () => {
    if (emailCheckStatus === "already_registered") return;
    if (emailCheckStatus === "idle" || emailCheckStatus === "checking") return;

    setFormData((prev) => ({
      ...prev,
      email: emailInput,
      full_name: emailCheckResult?.existing_registration?.full_name || prev.full_name,
      phone_number: emailCheckResult?.existing_registration?.phone_number || prev.phone_number,
      business_name: emailCheckResult?.existing_registration?.business_name || prev.business_name,
    }));

    setShowEmailDialog(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAnswerChange = (questionId: string, value: string, isMultiple: boolean) => {
    setFormData((prev) => {
      if (isMultiple) {
        const currentValues = prev.questionnaire_answers
          .filter((a) => a.question_id === questionId)
          .map((a) => a.answer_value);

        if (currentValues.includes(value)) {
          return {
            ...prev,
            questionnaire_answers: prev.questionnaire_answers
              .filter((a) => a.question_id !== questionId || a.answer_value !== value),
          };
        } else {
          return {
            ...prev,
            questionnaire_answers: [
              ...prev.questionnaire_answers.filter((a) => a.question_id !== questionId),
              ...currentValues.map((v) => ({ question_id: questionId, answer_value: v })),
              { question_id: questionId, answer_value: value },
            ],
          };
        }
      }

      const newAnswers = [
        ...prev.questionnaire_answers.filter((a) => a.question_id !== questionId),
        { question_id: questionId, answer_value: value },
      ];

      const statusQuestion = questions.find((q) => q.section === "Status UMKM");
      if (statusQuestion && questionId === statusQuestion.id && value.includes("Bukan")) {
        setIsNotUmkm(true);
      } else if (statusQuestion && questionId === statusQuestion.id) {
        setIsNotUmkm(false);
      }

      return {
        ...prev,
        questionnaire_answers: newAnswers,
      };
    });
  };

  const isAnswerSelected = (questionId: string, value: string): boolean => {
    return formData.questionnaire_answers
      .filter((a) => a.question_id === questionId)
      .some((a) => a.answer_value === value);
  };

  const checkUmkmStatus = () => {
    const statusQuestion = questions.find((q) => q.section === "Status UMKM");
    if (statusQuestion) {
      const answer = formData.questionnaire_answers.find((a) => a.question_id === statusQuestion.id);
      if (answer && answer.answer_value.includes("Bukan")) {
        setIsNotUmkm(true);
      }
    }
  };

  const isUmkmQuestionAnswered = (): boolean => {
    const statusQuestion = questions.find((q) => q.section === "Status UMKM");
    if (!statusQuestion) return false;
    return formData.questionnaire_answers.some((a) => a.question_id === statusQuestion.id);
  };

  const validateStep1 = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.full_name.trim()) {
      errors.full_name = "Nama Lengkap wajib diisi";
    }

    if (!formData.phone_number.trim()) {
      errors.phone_number = "No. HandPhone wajib diisi";
    } else {
      const phoneRegex = /^08\d{8,11}$/;
      const cleanPhone = formData.phone_number.replace(/[\s-]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        errors.phone_number = "Format: 081234567890";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    if (!needsQuestionnaire) return true;

    const statusQuestion = questions.find((q) => q.section === "Status UMKM");
    if (statusQuestion) {
      const answer = formData.questionnaire_answers.find((a) => a.question_id === statusQuestion.id);
      if (!answer) {
        setFormErrors({ questionnaire: "Jawaban pertanyaan pertama wajib diisi" });
        return false;
      }
      if (answer.answer_value.includes("Bukan")) {
        return true;
      }
    }

    const errors: FormErrors = {};
    const unansweredRequired = questions
      .filter((q) => q.is_required && q.section !== "Status UMKM")
      .filter((q) => {
        const answers = formData.questionnaire_answers.filter((a) => a.question_id === q.id);
        return answers.length === 0;
      });

    if (unansweredRequired.length > 0) {
      errors.questionnaire = `${unansweredRequired.length} pertanyaan belum dijawab`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateStep2()) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/events-public/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mendaftar event");
      }

      sessionStorage.setItem("registration_success", JSON.stringify({
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        business_name: formData.business_name,
      }));

      router.push(`/public-events/${eventId}/success`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white p-6 border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <p className="p-4 bg-orange-50 border-2 border-orange-600 text-sm font-bold text-orange-600 italic shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]">
            {error}
          </p>
          <Link href="/public-events" className="mt-4 inline-block text-orange-600 font-bold hover:underline">
            ← Kembali ke daftar event
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Email Verification Dialog */}
      {showEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md bg-white neo-border neo-shadow-large">
            {/* Dialog Header */}
            <div className="bg-slate-900 p-6 text-center">
              <div className="text-4xl mb-3">📧</div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Verifikasi Email
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Masukkan email Anda untuk melanjutkan
              </p>
            </div>

            {/* Dialog Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                    Alamat Email
                  </label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailCheckStatus("idle");
                      setEmailCheckResult(null);
                    }}
                    className="neo-input w-full p-3 border-2 border-slate-900 focus:bg-orange-50 outline-none transition-colors text-sm font-bold bg-white"
                    placeholder="email@anda.com"
                  />
                </div>

                {/* Status */}
                {emailCheckStatus === "checking" && (
                  <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-slate-200">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
                    <span className="text-sm font-medium text-slate-600">Memeriksa email...</span>
                  </div>
                )}

                {emailCheckStatus === "already_registered" && emailCheckResult?.existing_registration && (
                  <div className="p-4 bg-green-100 border-2 border-orange-500">
                    <p className="text-sm font-bold text-green-700 mb-2">
                      Hai, {emailCheckResult.existing_registration.full_name} Kamu sudah terdaftar untuk event ini!. Sampai ketemu di event ya!  
                    </p>
                    
                  </div>
                )}

                {emailCheckStatus === "found" && emailCheckResult && (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 border-2 border-green-400">
                      {emailCheckResult.has_questionnaire_answers ? (
                        <p className="text-sm font-bold text-green-700">
                          ✓ Email ditemukan! Data Anda sudah tersimpan.
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-green-700">
                          ✓ Email ditemukan! Anda perlu mengisi kuesioner.
                        </p>
                      )}
                    </div>
                    {emailCheckResult.existing_registration && (
                      <div className="p-3 bg-slate-50 border-2 border-slate-200">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                          Data Tersimpan:
                        </p>
                        <p className="text-sm font-medium text-slate-800">
                          {emailCheckResult.existing_registration.full_name}
                        </p>
                        {emailCheckResult.existing_registration.business_name && (
                          <p className="text-xs text-slate-500">
                            {emailCheckResult.existing_registration.business_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {emailCheckStatus === "not_found" && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-400">
                    <p className="text-sm font-bold text-blue-700">
                      📝 Email baru! Anda akan diminta mengisi kuesioner untuk melanjutkan.
                    </p>
                  </div>
                )}
              </div>

              {/* Dialog Actions */}
              <div className="mt-6 flex gap-3">
                {emailCheckStatus === "idle" && (
                  <button
                    onClick={checkEmail}
                    disabled={!emailInput || !emailInput.includes("@")}
                    className="flex-1 py-3 px-6 bg-slate-900 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-orange-600 hover:border-orange-600 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Verifikasi
                  </button>
                )}

                {emailCheckStatus === "checking" && (
                  <button
                    disabled
                    className="flex-1 py-3 px-6 bg-slate-400 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm opacity-50"
                  >
                    Memproses...
                  </button>
                )}

                {(emailCheckStatus === "found" || emailCheckStatus === "not_found") && (
                  <button
                    onClick={proceedAfterEmailCheck}
                    className="flex-1 py-3 px-6 bg-orange-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-orange-700 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    {needsQuestionnaire ? "Lanjut ke Kuesioner →" : "Daftar Sekarang →"}
                  </button>
                )}

                {emailCheckStatus === "already_registered" && (
                  <button
                    onClick={() => router.push(`/public-events/${eventId}`)}
                    className="flex-1 py-3 px-6 bg-white text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                  >
                    Kembali
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Registration Form - Only show when email dialog is closed and not already registered */}
      {!showEmailDialog && emailCheckStatus !== "already_registered" && (
        <div className="w-full max-w-4xl bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b-2 border-slate-900 p-6 flex justify-between items-center bg-white">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">
              MWX Indonesia <span className="text-orange-600 italic">untuk UMKM</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Pendaftaran Event
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500 uppercase">Event</p>
            <p className="font-black text-slate-900 max-w-[200px] truncate">{event?.name}</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Sidebar / Stepper */}
          <aside className="w-full md:w-1/4 bg-slate-50 border-b-2 md:border-b-0 md:border-r-2 border-slate-200 p-6">
            <div className="flex md:flex-col gap-4 md:gap-6">
              {[
                { step: 1, title: "Data Diri", desc: "Identitas peserta" },
                { step: 2, title: needsQuestionnaire ? "Kuesioner" : "Konfirmasi", desc: needsQuestionnaire ? "Evaluasi kesiapan digital" : "Verifikasi & daftar" },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-center gap-3 md:w-full">
                  <div
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 border-slate-900 flex items-center justify-center font-black italic text-xl md:text-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] ${
                      currentStep >= step
                        ? "bg-orange-600 text-white"
                        : "bg-white text-slate-400"
                    }`}
                  >
                    {String(step).padStart(2, "0")}
                  </div>
                  <div className="md:flex-1">
                    <p className="text-sm md:text-base font-black uppercase">{title}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 md:mt-8 hidden md:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Progress</p>
              <div className="h-2 bg-white border-2 border-slate-900">
                <div
                  className="h-full bg-orange-600 transition-all"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                {Math.round((currentStep / totalSteps) * 100)}%
              </p>
            </div>
          </aside>

          {/* Form Content */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[70vh] md:max-h-none">
            {error && (
              <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-600 text-sm font-bold text-orange-600 italic shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Step 1: Data Diri */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight mb-1">
                      Data Diri Peserta
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Lengkapi data di bawah untuk melanjutkan
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled
                        className="neo-input w-full p-3 border-2 border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Email sudah diverifikasi
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                        Nama Lengkap <span className="text-orange-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className={`neo-input w-full p-3 border-2 border-slate-900 focus:bg-orange-50 outline-none transition-colors text-sm font-bold bg-white ${
                          formErrors.full_name ? "border-orange-600 bg-orange-50" : ""
                        }`}
                        placeholder="Nama lengkap sesuai KTP"
                      />
                      {formErrors.full_name && (
                        <p className="text-xs text-orange-600 font-bold mt-1">{formErrors.full_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                        No. HandPhone <span className="text-orange-600">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        className={`neo-input w-full p-3 border-2 border-slate-900 focus:bg-orange-50 outline-none transition-colors text-sm font-bold bg-white ${
                          formErrors.phone_number ? "border-orange-600 bg-orange-50" : ""
                        }`}
                        placeholder="08xxxxxxxxxx"
                      />
                      {formErrors.phone_number && (
                        <p className="text-xs text-orange-600 font-bold mt-1">{formErrors.phone_number}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">
                        Nama Usaha / Brand
                      </label>
                      <input
                        type="text"
                        name="business_name"
                        value={formData.business_name}
                        onChange={handleChange}
                        className="neo-input w-full p-3 border-2 border-slate-900 focus:bg-orange-50 outline-none transition-colors text-sm font-bold bg-white"
                        placeholder="Nama usaha Anda (opsional)"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3 px-6 bg-slate-900 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-orange-600 hover:border-orange-600 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      {needsQuestionnaire ? "Lanjut ke Kuesioner →" : "Daftar Event →"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Kuesioner */}
              {currentStep === 2 && needsQuestionnaire && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight mb-1">
                      Kuesioner Evaluasi
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Jawab semua pertanyaan untuk membantu kami memahami kebutuhan Anda
                    </p>
                  </div>

                  {formErrors.questionnaire && (
                    <div className="p-4 bg-orange-50 border-2 border-orange-600 text-sm font-bold text-orange-600 italic shadow-[4px_4px_0px_0px_rgba(234,88,12,1)]">
                      {formErrors.questionnaire}
                    </div>
                  )}

                  {isNotUmkm ? (
                    <div className="bg-green-50 border-2 border-green-400 p-6 text-center">
                      <div className="mb-4 text-5xl">👍</div>
                      <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-green-700">
                        Terima Kasih!
                      </h2>
                      <p className="text-sm text-green-600 mb-4">
                        Kuesioner ini dikhususkan untuk pelaku UMKM. Selamat datang di event kami!
                      </p>
                    </div>
                  ) : (
                  <>
                    {/* Status UMKM Question - Always shown first */}
                    {sections.find((s) => s.title === "Status UMKM") && (
                      <div className="space-y-4 mb-6">
                        <div className="text-[10px] font-black text-orange-600 uppercase border-b-2 border-orange-100 pb-1 tracking-widest flex items-center gap-2">
                          <span>🏢</span>
                          <span>Status UMKM</span>
                        </div>
                        {sections
                          .find((s) => s.title === "Status UMKM")!
                          .questions.map((question, qIdx) => (
                            <div key={question.id} className="space-y-3">
                              <div className="flex gap-2">
                                <span className="text-[10px] font-bold text-slate-400 mt-0.5">1.</span>
                                <p className="text-sm font-bold text-slate-900 leading-tight">
                                  {question.question_text}
                                  {question.is_required && <span className="text-orange-600 ml-1">*</span>}
                                </p>
                              </div>
                              <div className="grid grid-cols-1 gap-2 pl-5">
                                {question.options.map((option, oIdx) => {
                                  const selected = isAnswerSelected(question.id, option);
                                  return (
                                    <label
                                      key={oIdx}
                                      className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all text-sm font-medium ${
                                        selected
                                          ? "border-orange-600 bg-orange-50 shadow-[2px_2px_0px_0px_rgba(234,88,12,1)]"
                                          : "border-slate-200 hover:border-slate-400 bg-white"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`question_${question.id}`}
                                        checked={selected}
                                        onChange={() => handleAnswerChange(question.id, option, false)}
                                        className="w-5 h-5 accent-orange-600"
                                      />
                                      <span>{option}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Remaining Sections */}
                    {sections
                      .filter((section) => section.title !== "Status UMKM")
                      .map((section) => (
                    <div key={section.title} className="space-y-4">
                      <div className="text-[10px] font-black text-orange-600 uppercase border-b-2 border-orange-100 pb-1 tracking-widest flex items-center gap-2">
                        <span>{section.icon}</span>
                        <span>{section.title}</span>
                      </div>

                      {section.questions.map((question, qIdx) => (
                        <div key={question.id} className="space-y-3">
                          <div className="flex gap-2">
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{qIdx + 1}.</span>
                            <p className="text-sm font-bold text-slate-900 leading-tight">
                              {question.question_text}
                              {question.is_required && <span className="text-orange-600 ml-1">*</span>}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-2 pl-5">
                            {question.options.map((option, oIdx) => {
                              const isMultiple = question.question_type === "multiple_choice";
                              const selected = isAnswerSelected(question.id, option);

                              return (
                                <label
                                  key={oIdx}
                                  className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all text-sm font-medium ${
                                    selected
                                      ? "border-orange-600 bg-orange-50 shadow-[2px_2px_0px_0px_rgba(234,88,12,1)]"
                                      : "border-slate-200 hover:border-slate-400 bg-white"
                                  }`}
                                >
                                  {isMultiple ? (
                                    <input type="checkbox" checked={selected}
                                      onChange={() => handleAnswerChange(question.id, option, true)}
                                      className="w-5 h-5 accent-orange-600" />
                                  ) : (
                                    <input type="radio" name={`question_${question.id}`} checked={selected}
                                      onChange={() => handleAnswerChange(question.id, option, false)}
                                      className="w-5 h-5 accent-orange-600" />
                                  )}
                                  <span>{option}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={handlePrevStep}
                      className="flex-1 py-3 px-6 bg-white text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
                      ← Kembali
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 py-3 px-6 bg-orange-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-orange-700 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50">
                      {submitting ? "Memproses..." : "Daftar Event"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Konfirmasi (jika kuesioner tidak perlu) */}
              {currentStep === 2 && !needsQuestionnaire && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="bg-green-50 border-2 border-green-400 p-6 text-center">
                    <div className="mb-4 text-5xl">✅</div>
                    <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-green-700">
                      Anda Siap Daftar!
                    </h2>
                    <p className="text-sm text-green-600">
                      Data Anda sudah lengkap dan kuesioner sebelumnya sudah tersimpan.
                    </p>
                  </div>

                  <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-6">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-4">
                      Ringkasan Pendaftaran
                    </h3>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Nama</dt>
                        <dd className="font-bold text-slate-900">{formData.full_name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Email</dt>
                        <dd className="font-bold text-slate-900">{formData.email}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">HP</dt>
                        <dd className="font-bold text-slate-900">{formData.phone_number}</dd>
                      </div>
                      {formData.business_name && (
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Usaha</dt>
                          <dd className="font-bold text-slate-900">{formData.business_name}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={handlePrevStep}
                      className="flex-1 py-3 px-6 bg-white text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
                      ← Kembali
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 py-3 px-6 bg-orange-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-orange-700 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50">
                      {submitting ? "Memproses..." : "Daftar Event"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 p-3 text-[10px] flex flex-col md:flex-row justify-between px-6 uppercase tracking-widest font-bold gap-2">
          <span>© 2026 MWX Indonesia</span>
          <span className="text-white">Business Growth Accelerator</span>
        </footer>
      </div>
      )}

      {/* Already Registered Message */}
      {emailCheckStatus === "already_registered" && (
        <div className="w-full max-w-4xl bg-white neo-border neo-shadow-large flex flex-col overflow-hidden">
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-black uppercase text-slate-900 mb-2">
              Anda Sudah Terdaftar
            </h2>
            <p className="text-slate-600 mb-6">
              Email ini sudah terdaftar di event ini. Sampai ketemu di event!
            </p>
            <button
              onClick={() => router.push(`/public-events`)}
              className="py-3 px-6 bg-orange-600 text-white border-2 border-slate-900 font-black uppercase tracking-widest text-sm hover:bg-orange-700 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Kembali ke Daftar Event
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
