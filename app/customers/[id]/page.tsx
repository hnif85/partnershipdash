import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerById, getReferralPartners } from "@/lib/cmsCustomers";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

export default async function CustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let customer = null;
  let partners: Awaited<ReturnType<typeof getReferralPartners>> = [];
  try {
    [customer, partners] = await Promise.all([getCustomerById(id), getReferralPartners()]);
  } catch (error) {
    console.error("Customer detail fetch failed", error);
    return (
      <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
        <div className="flex w-full flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-red-600">Gagal memuat detail customer.</p>
            <p className="text-sm text-zinc-600">Silakan coba lagi atau periksa koneksi database.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!customer) return notFound();

  const partnerLabel =
    customer.referal_code &&
    (partners.find((p) => p.code === customer.referal_code)?.partner || customer.referal_code);

  const profileFields: Array<{ label: string; value?: string | null; helper?: string | null }> = [
    { label: "Username", value: customer.username },
    { label: "Gender", value: customer.gender },
    { label: "Tanggal lahir", value: customer.birth_date ? formatDate(customer.birth_date) : "" },
    { label: "Phone", value: customer.phone_number },
    { label: "Email verified", value: customer.is_email_verified ? "Ya" : "Tidak" },
    { label: "Phone verified", value: customer.is_phone_number_verified ? "Ya" : "Tidak" },
    { label: "Identity verified", value: customer.is_identity_verified ? "Ya" : "Tidak" },
    { label: "Status", value: customer.status || customer.is_active || "-" },
    { label: "Referral", value: customer.referal_code, helper: partnerLabel },
    { label: "Lokasi", value: [customer.city, customer.country].filter(Boolean).join(" / ") },
    { label: "Identity number", value: customer.identity_number },
    { label: "Identity image", value: customer.identity_img },
    { label: "Bank", value: customer.bank_name, helper: customer.bank_account_number },
    { label: "Bank owner", value: customer.bank_owner_name },
    { label: "Perusahaan", value: customer.corporate_name },
    { label: "Industry", value: customer.industry_name },
    { label: "Employee qty", value: customer.employee_qty ? String(customer.employee_qty) : "" },
    { label: "Solution needs", value: customer.solution_corporate_needs },
    { label: "Free trial?", value: customer.is_free_trial_use ? "Ya" : "Tidak" },
    { label: "Dibuat", value: formatDate(customer.created_at), helper: customer.created_by_name || customer.created_by_guid },
    { label: "Diupdate", value: formatDate(customer.updated_at), helper: customer.updated_by_name || customer.updated_by_guid },
    { label: "Country/City ID", value: [customer.country_id, customer.city_id].filter(Boolean).join(" / ") },
    { label: "Subscribe list", value: customer.subscribe_list ? JSON.stringify(customer.subscribe_list) : "" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          <Link href="/customers" className="font-semibold text-[#1f3c88] hover:underline">
            Customers
          </Link>
          <span>/</span>
          <span className="font-semibold text-zinc-800">
            {customer.full_name || customer.email || customer.guid}
          </span>
        </div>

        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1f3c88]">
            CMS Customer Detail
          </p>
          <h1 className="text-3xl font-bold text-[#0f172a]">
            {customer.full_name || "Tanpa nama"}
          </h1>
          <p className="text-sm text-zinc-600">{customer.email || "Tidak ada email"}</p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase text-zinc-500">Profil Ringkas</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="Username" value={customer.username} />
            <Field label="Register pada" value={formatDate(customer.created_at)} />
            <Field label="Referral" value={customer.referal_code} helper={partnerLabel} />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase text-zinc-500">Aplikasi & Kredit</h3>
          {customer.app_credits && customer.app_credits.length ? (
            <div className="mt-4 overflow-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm text-zinc-800">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Aplikasi</th>
                    <th className="px-3 py-2 text-left">Penambahan</th>
                    <th className="px-3 py-2 text-left">Pengurangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {customer.app_credits.map((app) => (
                    <tr key={app.product_name}>
                      <td className="px-3 py-2 font-semibold text-[#0f172a]">{app.product_name}</td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-zinc-500">
                          Total: {Number(app.credit_added ?? 0).toLocaleString("id-ID")} kredit
                        </div>
                        <ul className="mt-1 space-y-1 text-xs text-zinc-700">
                          {app.credit_events && app.credit_events.length ? (
                            app.credit_events.map((ev, idx) => (
                              <li key={idx}>
                                {formatDate(ev.date)} — {Number(ev.amount ?? 0).toLocaleString("id-ID")} kredit
                              </li>
                            ))
                          ) : (
                            <li>-</li>
                          )}
                        </ul>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-zinc-500">
                          Total: {Number(app.credit_used ?? 0).toLocaleString("id-ID")} kredit
                        </div>
                        <ul className="mt-1 space-y-1 text-xs text-zinc-700">
                          {app.debit_events && app.debit_events.length ? (
                            app.debit_events.map((ev, idx) => (
                              <li key={idx}>
                                {formatDate(ev.date)} — {Number(ev.amount ?? 0).toLocaleString("id-ID")} kredit
                              </li>
                            ))
                          ) : (
                            <li>-</li>
                          )}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Belum ada data aplikasi.</p>
          )}
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase text-zinc-500">Training Data</h3>
          {customer.training_data && customer.training_data.length ? (
            <div className="mt-4 overflow-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm text-zinc-800">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Training</th>
                    <th className="px-3 py-2 text-left">Model</th>
                    <th className="px-3 py-2 text-left">Partner</th>
                    <th className="px-3 py-2 text-left">Tanggal Pelatihan</th>
                    
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {customer.training_data.map((item, idx) => (
                    <tr key={`${item?.nama_training || "training"}-${idx}`}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-[#0f172a]">{item?.nama_training || "-"}</div>                        
                      </td>
                      <td className="px-3 py-2">                       
                        <div className="text-xs text-zinc-500">{item?.model_training || "-"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-zinc-500">{item?.partner || "-"}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {formatDate(item?.event_date || item?.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Belum ada data training.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, helper }: { label: string; value?: string | null; helper?: string | null }) {
  const display = value && String(value).trim().length ? value : "-";
  const helperText = helper && helper !== display ? helper : "";
  return (
    <div className="space-y-1 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-[#0f172a]">{display}</p>
      {helperText ? <p className="text-xs text-zinc-500">{helperText}</p> : null}
    </div>
  );
}







