import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerById, getReferralPartners } from "@/lib/cmsCustomers";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" });
};

const buildCustomersBackHref = (searchParams?: { [key: string]: string | string[] | undefined }) => {
  const qs = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach((v) => qs.append(key, v));
      } else if (typeof val === "string") {
        qs.append(key, val);
      }
    });
  }
  const query = qs.toString();
  return `/customers${query ? `?${query}` : ""}`;
};

export default async function CustomerDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [paramResult, searchParamsResult] = await Promise.all([
    params,
    searchParams ?? Promise.resolve(undefined),
  ]);
  const { id } = paramResult;

  let customer = null;
  let partners: Awaited<ReturnType<typeof getReferralPartners>> = [];
  let deliverables: any[] = [];
  try {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const deliverablePath = `/api/createwhiz/deliverables/${encodeURIComponent(id)}`;
    const deliverableUrl = baseUrl ? `${baseUrl}${deliverablePath}` : deliverablePath;

    const [customerData, partnersData, deliverablesData] = await Promise.all([
      getCustomerById(id),
      getReferralPartners(),
      fetch(deliverableUrl, {
        cache: "no-store",
      }).then(async (res) => {
        if (!res.ok) {
          // If deliverables are missing (404) or other error, return empty set silently.
          return { deliverables: [] };
        }
        return res.json();
      }),
    ]);
    customer = customerData;
    partners = partnersData;
    deliverables = deliverablesData?.deliverables || [];
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

  const brand =
    customer.brand ||
    customer.corporate_name ||
    (customer as any).brand ||
    customer.full_name ||
    customer.username ||
    customer.email;

  const socialMedia = [
    (customer as any).instagram,
    (customer as any).instagram_url,
    (customer as any).ig,
    (customer as any).tiktok,
    (customer as any).tiktok_url,
    (customer as any).facebook,
    (customer as any).facebook_url,
    (customer as any).linkedin,
    (customer as any).website,
  ]
    .filter(Boolean)
    .join(" • ");
  const sortedDeliverables =
    Array.isArray(deliverables) && deliverables.length
      ? [...deliverables].sort((a, b) => {
          const timeA =
            new Date(a?.createdAt || a?.created_at || a?.updatedAt || a?.updated_at || 0).getTime() || 0;
          const timeB =
            new Date(b?.createdAt || b?.created_at || b?.updatedAt || b?.updated_at || 0).getTime() || 0;
          return timeB - timeA;
        })
      : [];

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

  // Extract product names from subscribe_list as a fallback when there are no credit transactions.
  const subscribedProducts =
    Array.isArray(customer.subscribe_list)
      ? customer.subscribe_list.flatMap((entry: any) => {
          const products = Array.isArray(entry?.product_list) ? entry.product_list : [];
          return products.map((p: any) => ({
            name: p?.product_name || p?.product || "-",
            expired_at: p?.expired_at || p?.expiredAt || p?.expired_date || p?.expiredAtDate || null,
          }));
        })
      : [];

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="flex w-full flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
          <Link
            href={buildCustomersBackHref(searchParamsResult)}
            className="font-semibold text-[#1f3c88] hover:underline"
          >
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
            <Field label="Phone" value={customer.phone_number} />
            <Field label="Brand" value={brand} />
            <Field label="Register pada" value={formatDate(customer.created_at)} />
            <Field label="Referral" value={`${partnerLabel} (${customer.referal_code})`} />
            <Field label="Sosial media" value={socialMedia || "-"} />
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
          ) : subscribedProducts.length ? (
            <div className="mt-4 space-y-2 text-sm text-zinc-800">
              {subscribedProducts.map((sub, idx) => (
                <div key={`${sub.name}-${idx}`} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <p className="font-semibold text-[#0f172a]">{sub.name || "-"}</p>
                  <p className="text-xs text-zinc-600">
                    Berlaku sampai: {sub.expired_at ? formatDate(sub.expired_at) : "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Belum ada data aplikasi.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase text-zinc-500">Deliverables (CreateWhiz)</h3>
            <span className="text-xs font-semibold text-zinc-500">{deliverables.length} item</span>
          </div>
          {deliverables.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedDeliverables.map((item) => {
                const preview = item?.thumbnailUrl || item?.fileUrl;
                const caption =
                  item?.captionText ||
                  (Array.isArray(item?.captionHashtags) ? item.captionHashtags.join(" ") : "") ||
                  "";
                const hashtagText =
                  Array.isArray(item?.captionHashtags) && item.captionHashtags.length
                    ? `#${item.captionHashtags.join(" #")}`
                    : "";
                const createdDate = item?.createdAt || item?.created_at || item?.updatedAt || item?.updated_at;
                return (
                  <article
                    key={item?.id || item?.fileUrl}
                    className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
                  >
                    {preview ? (
                      <div className="aspect-[9/16] w-full bg-zinc-100">
                        <img
                          src={preview}
                          alt={item?.title || item?.type || "Preview"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-2 p-3">
                      <div className="flex items-center justify-between text-xs uppercase text-zinc-500">
                        <span className="font-semibold">{item?.type || "Unknown"}</span>
                        {item?.duration ? <span>{item.duration}</span> : null}
                      </div>
                      <h4 className="text-sm font-semibold text-[#0f172a]">
                        {item?.title || "Tanpa judul"}
                      </h4>
                      {caption ? <p className="line-clamp-3 text-xs text-zinc-600">{caption}</p> : null}
                      {hashtagText ? (
                        <p className="text-[11px] font-semibold text-[#1f3c88]">{hashtagText}</p>
                      ) : null}
                      {createdDate ? (
                        <p className="text-[11px] text-zinc-500">Dibuat: {formatDate(createdDate)}</p>
                      ) : null}
                      <div className="flex items-center gap-2 pt-1">
                        {item?.fileUrl ? (
                          <Link
                            href={item.fileUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-md border border-[#1f3c88] px-2 py-1 text-xs font-semibold text-[#1f3c88] transition hover:bg-[#1f3c88] hover:text-white"
                          >
                            Lihat File
                          </Link>
                        ) : null}
                        {item?.thumbnailUrl && item.thumbnailUrl !== item.fileUrl ? (
                          <Link
                            href={item.thumbnailUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                          >
                            Thumbnail
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">Belum ada deliverables.</p>
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







