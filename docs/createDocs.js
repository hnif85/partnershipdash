const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, Header, Footer, PageOrientation
} = require('docx');
const fs = require('fs');

// ═══════════════════════════════════════════════
// WARNA TEMA
// ═══════════════════════════════════════════════
const C = {
  NAVY:    "1A3F6F",
  BLUE:    "2E75B6",
  LBLUE:   "DEEAF1",
  LLBLUE:  "EBF3FB",
  MINT:    "E2EFDA",
  GREEN:   "375623",
  YELLOW:  "FFF2CC",
  ORANGE:  "F4B942",
  ORANGE2: "FCE4D6",
  GRAY:    "F2F2F2",
  DGRAY:   "595959",
  WHITE:   "FFFFFF",
  BLACK:   "000000",
  RED:     "C00000",
  TEAL:    "1F7A8C",
  TEALLT:  "D6EEF2",
};

// ═══════════════════════════════════════════════
// BORDER HELPERS
// ═══════════════════════════════════════════════
const thin  = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
const med   = { style: BorderStyle.SINGLE, size: 4, color: C.BLUE };
const thick = { style: BorderStyle.SINGLE, size: 8, color: C.NAVY };
const none  = { style: BorderStyle.NONE,   size: 0, color: C.WHITE };

const bAll    = { top: thin,  bottom: thin,  left: thin,  right: thin  };
const bMed    = { top: med,   bottom: med,   left: med,   right: med   };
const bNone   = { top: none,  bottom: none,  left: none,  right: none  };
const bBottom = { top: none,  bottom: med,   left: none,  right: none  };

// ═══════════════════════════════════════════════
// TEXT HELPERS
// ═══════════════════════════════════════════════
function run(text, opts = {}) {
  return new TextRun({
    text,
    font: "Arial",
    size:      opts.size  || 20,
    bold:      opts.bold  || false,
    italic:    opts.it    || false,
    color:     opts.color || C.BLACK,
    underline: opts.ul    ? {} : undefined,
  });
}

function p(children, opts = {}) {
  const arr = typeof children === "string"
    ? [run(children, opts)]
    : (Array.isArray(children) ? children : [children]);
  return new Paragraph({
    alignment:     opts.align  || AlignmentType.LEFT,
    spacing:       { before: opts.before ?? 40, after: opts.after ?? 40, line: opts.line },
    indent:        opts.indent ? { left: opts.indent } : undefined,
    pageBreakBefore: opts.pageBreak || false,
    border:        opts.border || undefined,
    children:      arr,
  });
}

function bp() { return new Paragraph({ children: [new PageBreak()] }); }

function gap(size = 120) {
  return new Paragraph({ spacing: { before: 0, after: size }, children: [] });
}

// ═══════════════════════════════════════════════
// HEADING HELPERS
// ═══════════════════════════════════════════════
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    border:  { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.NAVY, space: 4 } },
    children: [run(text, { bold: true, size: 28, color: C.NAVY })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [run(text, { bold: true, size: 24, color: C.BLUE })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [run(text, { bold: true, size: 22, color: C.TEAL })],
  });
}

// ═══════════════════════════════════════════════
// BULLET / NUMBERED LIST HELPERS
// ═══════════════════════════════════════════════
function bul(text, opts = {}) {
  const ref = opts.ref || "bul1";
  const lvl = opts.level || 0;
  const children = [];
  if (opts.label) children.push(run(opts.label + " ", { bold: true, color: opts.labelColor || C.GREEN, size: opts.size || 19 }));
  children.push(run(text, { size: opts.size || 19, color: opts.color || C.BLACK, bold: opts.bold || false }));
  return new Paragraph({
    numbering: { reference: ref, level: lvl },
    spacing: { before: 30, after: 30 },
    children,
  });
}

function num(text, opts = {}) {
  return bul(text, { ...opts, ref: opts.ref || "num1" });
}

// ═══════════════════════════════════════════════
// TABLE CELL HELPERS
// ═══════════════════════════════════════════════
function tc(children, opts = {}) {
  const {
    fill    = C.WHITE,
    bold    = false,
    size    = 19,
    color   = C.BLACK,
    align   = AlignmentType.LEFT,
    vAlign  = VerticalAlign.TOP,
    borders = bAll,
    colSpan = 1,
    rowSpan = 1,
    width,
    italic  = false,
  } = opts;

  const paras = Array.isArray(children)
    ? children
    : [p(children, { align, before: 40, after: 40, size, bold, color, italic })];

  const cellProps = {
    borders,
    shading:       { fill, type: ShadingType.CLEAR },
    margins:       { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: vAlign,
    children:      paras,
  };
  if (width)   cellProps.width       = { size: width, type: WidthType.DXA };
  if (colSpan > 1) cellProps.columnSpan = colSpan;
  if (rowSpan > 1) cellProps.rowSpan    = rowSpan;
  return new TableCell(cellProps);
}

function th(text, width, opts = {}) {
  return tc(text, {
    fill:   opts.fill   || C.NAVY,
    bold:   true,
    size:   opts.size   || 20,
    color:  opts.color  || C.WHITE,
    align:  opts.align  || AlignmentType.CENTER,
    vAlign: VerticalAlign.CENTER,
    borders: bAll,
    width,
    ...opts,
  });
}

function thBlue(text, width, opts = {}) {
  return th(text, width, { fill: C.BLUE, ...opts });
}

function thTeal(text, width, opts = {}) {
  return th(text, width, { fill: C.TEAL, ...opts });
}

// ═══════════════════════════════════════════════
// CONTENT WIDTH: A4 Landscape, margin 0.75"
// 16838 - 2*1080 = 14678 DXA
// ═══════════════════════════════════════════════
const CW = 14678; // full content width landscape A4
const CWP = 9360; // portrait A4 content width

// ═══════════════════════════════════════════════
// NUMBERING CONFIG
// ═══════════════════════════════════════════════
const numbering = {
  config: [
    { reference: "bul1", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "\u2022",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 480, hanging: 240 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "\u25E6",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 840, hanging: 240 } } } },
    ]},
    { reference: "num1", levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } },
    ]},
    { reference: "num2", levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 280 } } } },
    ]},
    { reference: "alpha1", levels: [
      { level: 0, format: LevelFormat.LOWER_LETTER, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 300 } } } },
    ]},
  ]
};

// ═══════════════════════════════════════════════
// HEADER & FOOTER
// ═══════════════════════════════════════════════
function makeHeader() {
  return new Header({ children: [
    p([
      run("SILABUS PELATIHAN KILAT MEMBUAT TAHU HIGIENIS SKALA RUMAH TANGGA  ", { bold: true, size: 17, color: C.NAVY }),
      run("|  Dokumen Resmi Penyelenggara", { size: 17, color: C.DGRAY }),
    ], { align: AlignmentType.LEFT, before: 0, after: 80,
         border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.BLUE, space: 4 } } }),
  ]});
}

function makeFooter() {
  return new Footer({ children: [
    p([run("Pelatihan Tahu Higienis Skala Rumah Tangga  |  1 Hari · 8 JP  |  15–20 Peserta  |  Hak Cipta Penyelenggara",
        { size: 17, color: C.DGRAY })],
      { align: AlignmentType.CENTER, before: 80, after: 0,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.BLUE, space: 4 } } }),
  ]});
}

// ═══════════════════════════════════════════════════════════════════════
// ██████████████████ SECTION 1 – LANDSCAPE (Jadwal Utama) ████████████
// ═══════════════════════════════════════════════════════════════════════

// Jadwal Table: CW = 14678
// Cols: Waktu(1500) | Sesi(1800) | Tujuan(2400) | Materi(4678) | Metode(1800) | Output(2500)
const JC = [1500, 1800, 2400, 4678, 1800, 2500];

function jRow(waktu, sesi, tujuan, materiItems, metode, output, isBreak = false) {
  if (isBreak) {
    return new TableRow({ children: [
      new TableCell({
        columnSpan: 6,
        shading: { fill: C.GRAY, type: ShadingType.CLEAR },
        borders: bAll,
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [p([
          run(waktu, { bold: true, size: 19, color: C.DGRAY }),
          run("   " + sesi, { size: 19, color: C.DGRAY, it: true }),
        ], { align: AlignmentType.CENTER, before: 20, after: 20 })],
      })
    ]});
  }

  const materiBullets = materiItems.map(([txt, isNew]) =>
    new Paragraph({
      numbering: { reference: "bul1", level: 0 },
      spacing: { before: 25, after: 25 },
      children: isNew
        ? [run("[BARU] ", { bold: true, size: 17, color: "2E7D32" }),
           run(txt, { size: 17 })]
        : [run(txt, { size: 17 })],
    })
  );

  return new TableRow({ children: [
    tc([p(waktu, { align: AlignmentType.CENTER, bold: true, size: 18, color: C.NAVY, before: 0, after: 0 })],
       { fill: C.LLBLUE, vAlign: VerticalAlign.CENTER, width: JC[0] }),
    tc([p(sesi, { bold: true, size: 19, color: C.NAVY, before: 0, after: 4 }),
        ...( metode ? [p(metode, { it: true, size: 16, color: C.DGRAY, before: 0, after: 0 })] : []) ],
       { fill: C.LBLUE, vAlign: VerticalAlign.TOP, width: JC[1] }),
    tc(tujuan, { fill: C.WHITE, size: 18, width: JC[2] }),
    tc(materiItems.length ? materiBullets : [p("—", { size: 17, color: C.DGRAY })],
       { fill: C.WHITE, width: JC[3] }),
    tc(metode || "—", { fill: C.LLBLUE, size: 17, align: AlignmentType.CENTER, width: JC[4], vAlign: VerticalAlign.CENTER }),
    tc([p(output, { bold: true, size: 17, color: C.NAVY, before: 0, after: 0 })],
       { fill: C.LBLUE, vAlign: VerticalAlign.CENTER, align: AlignmentType.CENTER, width: JC[5] }),
  ]});
}

const jadwalTable = new Table({
  width: { size: CW, type: WidthType.DXA },
  columnWidths: JC,
  rows: [
    // Header
    new TableRow({ tableHeader: true, children: [
      th("Waktu",         JC[0], { fill: C.NAVY }),
      th("Sesi",          JC[1], { fill: C.NAVY }),
      th("Tujuan Sesi",   JC[2], { fill: C.NAVY }),
      th("Materi Kunci",  JC[3], { fill: C.NAVY }),
      th("Metode",        JC[4], { fill: C.NAVY }),
      th("Output / Hasil", JC[5], { fill: C.NAVY }),
    ]}),

    // 1. PEMBUKAAN
    jRow("08.00 – 08.30", "Pembukaan",
      "Peserta siap, tahu tujuan pelatihan, alur kegiatan, dan komitmen belajar",
      [
        ["Sambutan penyelenggara & perkenalan fasilitator", false],
        ["Ice breaking singkat (peserta saling kenal)", false],
        ["Penjelasan tujuan, target hasil, dan manfaat pelatihan", false],
        ["Pembagian kelompok: 4 kelompok @ 4–5 orang", false],
        ["Briefing keselamatan dapur & APD wajib pakai", true],
        ["Pembagian lembar kerja peserta (resep baku + checklist + HPP)", true],
        ["Pengenalan alat dan fungsi masing-masing secara singkat", true],
        ["Kontrak belajar: komitmen aktif dan saling menghargai", false],
      ],
      "Briefing + Ice Breaking",
      "Peserta siap praktik, kelompok terbentuk, lembar kerja dibagikan"),

    // 2. TEORI SINGKAT
    jRow("08.30 – 09.15", "Teori Dasar Tahu",
      "Peserta memahami prinsip ilmiah & standar baku sebelum masuk praktik",
      [
        ["Pengertian tahu: definisi, jenis, dan nilai gizi kedelai", false],
        ["Cara memilih kedelai bagus: warna, ukuran, kadar air, aroma", false],
        ["Proses biokimia: mengapa susu kedelai bisa menggumpal", false],
        ["Jenis koagulan & perbedaannya: tahu batu vs cuka vs GDL", false],
        ["Standar suhu rebus: 85–90°C selama 15 menit (hilangkan bau langu)", true],
        ["Takaran baku koagulan per liter susu kedelai", true],
        ["3 kesalahan fatal yang paling sering terjadi & cara mencegahnya", false],
        ["Prinsip higienitas & sanitasi dapur produksi tahu", true],
        ["Tanya jawab interaktif: peserta mengajukan pertanyaan awal", false],
      ],
      "Ceramah + QnA",
      "Peserta paham konsep dasar & standar baku proses tahu putih"),

    // 3. PRAKTIK 1
    jRow("09.15 – 10.30", "Praktik 1:\nKedelai → Susu",
      "Peserta terampil mengolah kedelai menjadi susu kedelai bersih siap koagulasi",
      [
        ["Sortasi kedelai: buang yang keriput, berjamur, atau rusak", false],
        ["Pencucian 3 tahap dengan air bersih mengalir", false],
        ["Kedelai sudah direndam H-1 (6–8 jam): cek tekstur siap giling", false],
        ["Penggilingan: rasio air 1:6 (1 bagian biji : 6 bagian air)", false],
        ["Perebusan: pantau suhu dengan termometer, aduk rutin, buang busa", false],
        ["Penyaringan: teknik tekan kain saring agar susu maksimal & tidak keruh", false],
        ["Checklist sanitasi alat sebelum dan sesudah digunakan", true],
        ["Catat suhu & waktu di lembar kerja kelompok masing-masing", true],
        ["Fasilitator memantau & memberi koreksi langsung tiap kelompok", false],
      ],
      "Demo + Praktik\nKelompok",
      "Susu kedelai bersih siap dikoagulasi (min. 2 liter/kelompok)"),

    // ISTIRAHAT 1
    jRow("10.30 – 10.45", "ISTIRAHAT 1  —  Snack, cuci tangan, sanitasi area kerja", "", [], "", "", true),

    // 4. PRAKTIK 2
    jRow("10.45 – 12.15", "Praktik 2:\nCetak Tahu Putih",
      "Peserta mampu mencetak tahu putih yang padat, tidak asam, dan tidak mudah hancur",
      [
        ["Cek suhu susu sebelum koagulasi: ideal 70–75°C", false],
        ["Larutkan koagulan (batu atau cuka) sesuai takaran baku", false],
        ["Teknik menuang & mengaduk koagulan: perlahan, searah, tidak kencang", false],
        ["Menunggu gumpalan terbentuk sempurna (jangan dipaksa)", false],
        ["Pemisahan whey: tuang perlahan, jangan buang semua", false],
        ["Cetak ke cetakan kayu yang sudah dilapisi kain saring bersih", false],
        ["Pres: beri beban merata, minimal 20–30 menit (lama = makin padat)", false],
        ["Potong tahu ukuran seragam (standar: 6×6×4 cm atau sesuai pasar)", false],
        ["Uji kualitas: uji kepadatan (tekan jari) & uji rasa (tidak asam, tidak pahit)", true],
        ["Perbandingan hasil antar kelompok: batu vs cuka", true],
      ],
      "Praktik\nKelompok",
      "Tahu putih padat, tidak asam, tidak hancur, siap dievaluasi"),

    // ISHOMA
    jRow("12.15 – 13.00", "ISHOMA  —  Makan siang, salat, istirahat", "", [], "", "", true),

    // 5. EVALUASI
    jRow("13.00 – 14.00", "Evaluasi &\nTroubleshooting",
      "Peserta mampu mengidentifikasi masalah dan solusinya berdasarkan hasil praktik",
      [
        ["Presentasi hasil tiap kelompok: tampilkan tahu ke depan kelas", false],
        ["Fasilitator membedah kualitas: warna, tekstur, rasa, aroma", false],
        ["Diskusi: kenapa tahu hancur? Kenapa asam? Kenapa pahit? Kenapa lembek?", false],
        ["Tabel rujukan standar: suhu vs hasil, takaran vs tekstur", true],
        ["Solusi dan perbaikan untuk tiap problem yang ditemukan", true],
        ["Teknik penyimpanan tahu putih: rendam air bersih, ganti tiap hari", false],
        ["Tahan berapa lama? Suhu ruang vs kulkas vs freezer", false],
        ["Lembar evaluasi produk per kelompok diisi bersama fasilitator", true],
        ["Tips: cara tahu tidak berlendir & tidak bau setelah 2 hari", false],
      ],
      "Diskusi &\nEvaluasi Produk",
      "Lembar evaluasi terisi, peserta paham akar masalah & solusinya"),

    // 6. OLAHAN & KEMAS
    jRow("14.00 – 14.45", "Olahan &\nPengemasan",
      "Peserta mengetahui produk turunan tahu & mampu mengemas secara higienis dan menarik",
      [
        ["Demo tahu kuning: bahan pewarna alami (kunyit) & proses celup", false],
        ["Demo tahu pong: teknik goreng & kondisi minyak yang tepat", false],
        ["Peluang produk lain: tahu sutra, tahu isi, tahu bacem", false],
        ["Pilih plastik food-grade: HDPE atau PP, bukan plastik sembarangan", true],
        ["Label minimal UMKM: nama produk, berat bersih, tanggal produksi, kontak", true],
        ["Cara menghitung isi per kemasan untuk efisiensi & konsisten", false],
        ["Dasar branding sederhana: tampil beda di pasar tradisional & online", true],
        ["Tips foto produk menarik untuk WA/Instagram menggunakan HP", true],
        ["Praktik kemas 1 porsi tahu + tempel label oleh tiap kelompok", false],
      ],
      "Demo + Praktik\nSingkat",
      "1 produk turunan + 1 kemasan berlabel siap jual per kelompok"),

    // 7. BISNIS & PENUTUP
    jRow("14.45 – 16.00", "Bisnis &\nPenutup",
      "Peserta mampu menghitung HPP, menentukan harga jual, dan membuat RTL usaha tahu",
      [
        ["Komponen HPP: bahan baku + operasional + kemasan + tenaga kerja", false],
        ["Simulasi hitung HPP 1 cetak tahu (1 kg kedelai → ±8–10 potong)", false],
        ["Menentukan harga jual: HPP + margin 30–50%", false],
        ["Simulasi BEP: berapa cetak/hari untuk balik modal dalam 1 bulan", true],
        ["Strategi pemasaran awal: warung tetangga, WA Bisnis, pasar pagi", false],
        ["Post-test: 10 soal pilihan ganda + 2 soal praktik (tertulis)", true],
        ["Rencana Tindak Lanjut (RTL): target produksi & penjualan 2 minggu ke depan", false],
        ["Evaluasi pelatihan: isi formulir kepuasan peserta", true],
        ["Foto bersama, penyerahan sertifikat, dan sambutan penutup", false],
      ],
      "Workshop +\nSesi Penutupan",
      "HPP & BEP dipahami, RTL ditulis, sertifikat diterima"),
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// ██████████████████ SECTION 2 – PORTRAIT (Detail Materi) ████████████
// ═══════════════════════════════════════════════════════════════════════

// ── MATERI DETAIL TABLE ──
// Cols portrait: No(600) | Sesi(2200) | Uraian Materi(6560)
const MC = [600, 2200, 6560];

function mRow(no, sesi, uraianItems, fillSesi = C.LBLUE) {
  return new TableRow({ children: [
    tc(no, { fill: C.LLBLUE, align: AlignmentType.CENTER, bold: true, size: 19, width: MC[0], vAlign: VerticalAlign.CENTER }),
    tc([p(sesi, { bold: true, size: 19, color: C.NAVY, before: 0, after: 0 })],
       { fill: fillSesi, width: MC[1], vAlign: VerticalAlign.CENTER }),
    tc(uraianItems.map(([txt, lvl]) => new Paragraph({
      numbering: { reference: lvl > 0 ? "bul1" : "num1", level: lvl > 0 ? 1 : 0 },
      spacing: { before: 25, after: 25 },
      children: [run(txt, { size: 18 })],
    })), { fill: C.WHITE, width: MC[2] }),
  ]});
}

const materiDetail = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: MC,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("No",          MC[0], { fill: C.NAVY }),
      th("Sesi",        MC[1], { fill: C.NAVY }),
      th("Uraian Materi Lengkap", MC[2], { fill: C.NAVY }),
    ]}),

    mRow("1", "Teori Dasar\nPembuatan Tahu", [
      ["Definisi tahu dan posisinya sebagai pangan lokal bergizi", 0],
      ["Kandungan gizi kedelai: protein 36–40%, isoflavon, mineral", 1],
      ["Jenis-jenis tahu di Indonesia: putih, kuning, sutra, pong, isi", 1],
      ["Standar mutu tahu yang baik: warna, tekstur, aroma, rasa", 1],
      ["Kriteria kedelai berkualitas baik untuk tahu", 0],
      ["Visual langsung (tunjukkan contoh kedelai bagus vs jelek)", 1],
      ["Pengujian sederhana kadar air: tekan jari, aroma, warna kulit", 1],
      ["Prinsip koagulasi protein kedelai", 0],
      ["Mengapa susu kedelai bisa berubah menjadi padatan (gel protein)", 1],
      ["Perbedaan koagulan: tahu batu (CaSO4), cuka (asam asetat), GDL", 1],
      ["Pengaruh koagulan terhadap tekstur, rasa, dan daya simpan tahu", 1],
      ["Tabel standar baku proses (suhu, waktu, takaran) — dibagikan di lembar kerja", 1],
      ["Kesalahan fatal & pencegahannya", 0],
      ["Tahu hancur: terlalu sedikit koagulan / suhu terlalu tinggi saat koagulasi", 1],
      ["Tahu asam: koagulan cuka terlalu banyak / koagulasi terlalu lama", 1],
      ["Tahu bau/langu: susu kedelai tidak direbus sempurna / air kotor", 1],
      ["Tahu lembek: lama pres tidak cukup / whey belum terbuang bersih", 1],
      ["Prinsip sanitasi & higienitas", 0],
      ["APD: celemek, penutup kepala, sarung tangan saat cetak", 1],
      ["Cuci tangan 6 langkah WHO sebelum kontak bahan pangan", 1],
      ["Sanitasi alat: rebus atau rendam air panas 80°C min. 5 menit", 1],
      ["Standar air: gunakan air matang atau air bersih bersertifikat", 1],
    ]),

    mRow("2", "Praktik 1:\nKedelai → Susu Kedelai", [
      ["Persiapan bahan & sanitasi area kerja", 0],
      ["Cek kedelai yang sudah direndam: sudah mengembang, tidak berbau asam", 1],
      ["Bilas 3 kali dengan air bersih sebelum digiling", 1],
      ["Pastikan blender/mesin giling dalam kondisi bersih", 1],
      ["Proses penggilingan", 0],
      ["Masukkan kedelai + air dengan rasio 1:6 (berat:volume)", 1],
      ["Giling sampai halus dan merata (min. 2 menit per batch)", 1],
      ["Tampung dalam baskom bersih, jangan biarkan terkena debu", 1],
      ["Perebusan susu kedelai", 0],
      ["Tuang ke panci, nyalakan api sedang", 1],
      ["Pantau suhu dengan termometer: target 85–90°C", 1],
      ["Aduk terus searah jarum jam agar tidak gosong di dasar panci", 1],
      ["Buang busa yang terbentuk di permukaan dengan sendok bersih", 1],
      ["Pertahankan suhu 85–90°C selama 15 menit penuh (timer!)", 1],
      ["Penyaringan susu kedelai", 0],
      ["Siapkan cetakan/wadah dengan kain saring bersih di atasnya", 1],
      ["Tuang susu kedelai panas ke kain saring perlahan-lahan", 1],
      ["Peras kain saring dengan tangan (gunakan sarung tangan tahan panas)", 1],
      ["Ampas (okara) simpan terpisah — bisa diolah menjadi produk lain", 1],
      ["Susu kedelai bersih siap dikoagulasi — jangan biarkan terlalu lama mendingin", 1],
      ["Dokumentasi: catat suhu akhir & volume susu di lembar kerja kelompok", 1],
    ]),

    mRow("3", "Praktik 2:\nCetak Tahu Putih", [
      ["Persiapan koagulasi", 0],
      ["Cek suhu susu kedelai dengan termometer: tunggu hingga 70–75°C", 1],
      ["Larutkan koagulan batu dalam air hangat secukupnya sebelum dituang", 1],
      ["Siapkan cetakan kayu bersih yang sudah dilapisi kain saring", 1],
      ["Proses koagulasi", 0],
      ["Tuang larutan koagulan ke susu kedelai sambil diaduk perlahan searah", 1],
      ["Aduk 2–3 kali saja (jangan terlalu banyak, merusak gumpalan)", 1],
      ["Tutup panci dan diamkan 5–8 menit hingga gumpalan terbentuk sempurna", 1],
      ["Cek gumpalan: sudah terpisah dari whey (cairan jernih kekuningan)", 1],
      ["Pencetakan tahu", 0],
      ["Pindahkan gumpalan perlahan ke cetakan dengan sendok berlubang", 1],
      ["Lipat kain saring di atas gumpalan secara rapi dan merata", 1],
      ["Pasang tutup cetakan, beri beban di atas (batu/panci berisi air)", 1],
      ["Biarkan 20–30 menit (untuk tahu padat) — catat waktu mulai", 1],
      ["Penyelesaian & pemotongan", 0],
      ["Angkat tutup cetakan, buka kain saring perlahan", 1],
      ["Tahu putih sudah terbentuk, rendam air bersih dingin 5 menit", 1],
      ["Potong dengan pisau bersih: ukuran 6×6×4 cm atau sesuai kebutuhan", 1],
      ["Uji kualitas: tekan perlahan (padat), cicipi (tidak asam/pahit), cek warna (putih bersih)", 1],
    ]),

    mRow("4", "Evaluasi &\nTroubleshooting", [
      ["Protokol evaluasi produk kelompok", 0],
      ["Setiap kelompok menyajikan tahu hasil praktik di meja evaluasi", 1],
      ["Fasilitator menilai: warna, tekstur, aroma, rasa, penampilan", 1],
      ["Peserta lain memberikan feedback menggunakan lembar penilaian", 1],
      ["Panduan troubleshooting (referensi fasilitator)", 0],
      ["Masalah: TAHU HANCUR → Penyebab: koagulan kurang / suhu terlalu tinggi / pres terlalu singkat", 1],
      ["Solusi: tambah takaran koagulan, turunkan suhu koagulasi, perpanjang waktu pres", 1],
      ["Masalah: TAHU ASAM → Penyebab: cuka terlalu banyak / koagulasi terlalu lama", 1],
      ["Solusi: kurangi takaran cuka, ganti ke koagulan batu, cuci tahu setelah cetak", 1],
      ["Masalah: TAHU PAHIT → Penyebab: kedelai kurang bersih / susu tidak direbus sempurna", 1],
      ["Solusi: pastikan rebus 85–90°C selama 15 menit penuh, bilas kedelai lebih bersih", 1],
      ["Masalah: TAHU LEMBEK → Penyebab: pres terlalu sebentar / whey belum keluar bersih", 1],
      ["Solusi: perpanjang waktu pres, tambah beban, pastikan kain saring tidak berlipat", 1],
      ["Teknik penyimpanan & daya simpan", 0],
      ["Suhu ruang: rendam dalam air bersih dalam wadah tertutup, ganti air setiap hari → tahan 2–3 hari", 1],
      ["Kulkas (4–8°C): rendam air bersih, tahan 5–7 hari", 1],
      ["Freezer (–18°C): tanpa air, bungkus plastik kedap udara, tahan 1–2 bulan", 1],
      ["Tanda tahu sudah tidak layak: berlendir, bau asam menyengat, warna kekuningan/kehijauan", 1],
    ]),

    mRow("5", "Olahan Turunan\n& Pengemasan", [
      ["Produk turunan dari tahu putih", 0],
      ["TAHU KUNING: celup dalam larutan kunyit 1% + air garam, rebus 10 menit", 1],
      ["TAHU PONG: goreng tahu putih dalam minyak panas 180°C hingga mengembang", 1],
      ["TAHU SUTRA: gunakan koagulan GDL, suhu koagulasi lebih rendah (60°C)", 1],
      ["TAHU BACEM: rebus tahu dalam bumbu kecap + rempah + gula jawa", 1],
      ["Estimasi nilai tambah: tahu putih Rp500/ptg → tahu kuning Rp900/ptg → tahu pong Rp1.200/ptg", 1],
      ["Teknik pengemasan higienis", 0],
      ["Pilih plastik food-grade: PP (kode 5) atau HDPE (kode 2) — aman untuk pangan", 1],
      ["Hindari plastik daur ulang atau plastik tanpa kode (berbahaya)", 1],
      ["Isi per kemasan: 5 potong (±250g) atau 10 potong (±500g)", 1],
      ["Tambahkan sedikit air dalam kemasan agar tahu tidak kering", 1],
      ["Ikat rapat atau seal dengan lilin/alat sealer sederhana", 1],
      ["Label UMKM minimal", 0],
      ["Nama produk (contoh: Tahu Putih Segar Bu Sari)", 1],
      ["Berat bersih (contoh: 250 gram / 5 potong)", 1],
      ["Tanggal produksi & tanggal kadaluarsa", 1],
      ["Nomor kontak / WA produsen", 1],
      ["Jika ada: nomor P-IRT atau izin edar BPOM", 1],
      ["Branding sederhana & pemasaran awal", 0],
      ["Desain label mudah menggunakan Canva (gratis, bisa di HP)", 1],
      ["Foto produk: cahaya alami dari jendela, background polos, prop daun pisang", 1],
      ["Channel awal: WA Bisnis, grup ibu-ibu, pasar pagi, warung kelontong tetangga", 1],
    ]),

    mRow("6", "Hitung Bisnis:\nHPP, Harga Jual,\nBEP", [
      ["Komponen Harga Pokok Produksi (HPP)", 0],
      ["Bahan baku: kedelai, koagulan batu/cuka, air, garam", 1],
      ["Biaya energi: gas/listrik untuk rebus & proses", 1],
      ["Kemasan: plastik food-grade + label", 1],
      ["Tenaga kerja: hitung per jam atau per sesi produksi", 1],
      ["Biaya tak terduga / overhead: 5–10% dari total biaya", 1],
      ["Contoh simulasi HPP (angka ilustrasi, sesuaikan dengan harga daerah)", 0],
      ["1 kg kedelai @ Rp12.000 → menghasilkan ±8–10 potong tahu putih", 1],
      ["Koagulan batu: Rp500 | Gas: Rp2.000 | Plastik+label: Rp500 per produksi", 1],
      ["Total biaya per produksi: ±Rp15.000 → HPP per potong: Rp1.500–1.875", 1],
      ["Harga jual target (margin 40%): Rp2.100–2.600 per potong", 1],
      ["Simulasi BEP (Break Even Point)", 0],
      ["BEP unit = Total Biaya Tetap ÷ (Harga Jual – HPP per unit)", 1],
      ["Jika biaya tetap/hari Rp30.000 dan margin Rp700/potong → BEP = 43 potong/hari", 1],
      ["Artinya: produksi & jual minimal 43 potong/hari untuk balik modal", 1],
      ["Strategi pemasaran awal untuk UMKM tahu rumahan", 0],
      ["Mulai dari lingkungan sendiri: tetangga, RT, warung terdekat", 1],
      ["Buka WA Bisnis: foto produk, deskripsi singkat, harga jelas", 1],
      ["Daftar ke marketplace daerah atau aplikasi delivery lokal", 1],
      ["Konsistensi kualitas lebih penting dari promosi di awal usaha", 1],
    ]),
  ]
});

// ── STANDAR BAKU TABLE ──
const SC = [2500, 1800, 2560, 2500];

const standardTable = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: SC,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("Tahap Proses",     SC[0], { fill: C.NAVY }),
      th("Parameter",        SC[1], { fill: C.NAVY }),
      th("Standar Baku",     SC[2], { fill: C.NAVY }),
      th("Catatan Penting",  SC[3], { fill: C.NAVY }),
    ]}),
    ...[
      ["Perendaman kedelai (H-1)", "Durasi",         "6 – 8 jam (maks. 10 jam)",          "Jika over-rendam → bau asam, tahu gagal"],
      ["Perebusan susu kedelai",   "Suhu target",    "85 – 90 °C",                         "Wajib gunakan termometer masak"],
      ["Perebusan susu kedelai",   "Durasi rebus",   "15 menit setelah suhu tercapai",     "Aduk, buang busa, jangan tutup rapat"],
      ["Koagulasi",                "Suhu saat koag.", "70 – 75 °C",                        "Jangan terlalu panas atau terlalu dingin"],
      ["Koagulasi",                "Takaran batu",   "3 – 5 g / liter susu",               "Larutkan dalam air hangat dulu"],
      ["Koagulasi",                "Takaran cuka",   "30 – 40 ml / liter susu",            "Tuang perlahan sambil diaduk"],
      ["Koagulasi",                "Waktu tunggu",   "5 – 8 menit",                        "Tutup panci, jangan ganggu"],
      ["Pengepresan",              "Lama pres min.", "20 – 30 menit",                      "Makin lama = makin padat"],
      ["Pengepresan",              "Beban pres",     "1 – 2 kg merata di atas cetakan",    "Gunakan panci berisi air sebagai beban"],
      ["Penyimpanan (suhu ruang)", "Media simpan",   "Rendam air bersih dalam wadah tutup", "Ganti air setiap hari"],
      ["Penyimpanan (suhu ruang)", "Daya simpan",    "2 – 3 hari",                         "Jika berlendir/bau → buang"],
      ["Penyimpanan (kulkas)",     "Suhu kulkas",    "4 – 8 °C",                           "Rendam air bersih, tahan 5–7 hari"],
    ].map(([proses, param, standar, catatan], i) =>
      new TableRow({ children: [
        tc(proses,  { fill: i%2===0 ? C.LBLUE  : C.LLBLUE, bold: true,  size: 18, width: SC[0] }),
        tc(param,   { fill: i%2===0 ? C.LLBLUE : C.WHITE,  size: 18,    width: SC[1] }),
        tc(standar, { fill: i%2===0 ? C.MINT   : C.WHITE,  size: 18, bold: true, align: AlignmentType.CENTER, width: SC[2] }),
        tc(catatan, { fill: i%2===0 ? C.WHITE  : C.LLBLUE, size: 17, italic: true, color: C.DGRAY, width: SC[3] }),
      ]})
    ),
  ]
});

// ── TROUBLESHOOTING TABLE ──
const TC2 = [2200, 2600, 2460, 2100];

const troubleTable = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: TC2,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("Masalah / Gejala",   TC2[0], { fill: C.RED }),
      th("Penyebab Utama",     TC2[1], { fill: C.RED }),
      th("Solusi & Tindakan",  TC2[2], { fill: C.RED }),
      th("Cara Mencegah",      TC2[3], { fill: C.RED }),
    ]}),
    ...[
      ["Tahu hancur / tidak\nberbentuk",
       "• Koagulan terlalu sedikit\n• Suhu koagulasi terlalu tinggi (>80°C)\n• Pres terlalu singkat\n• Gumpalan dipaksa cetak sebelum sempurna",
       "• Tambah 1–2 g koagulan per liter\n• Tunggu suhu turun ke 70–75°C\n• Perpanjang pres 10 menit\n• Jangan cetak terburu-buru",
       "Ikuti standar baku suhu & takaran koagulan; pasang timer pres"],
      ["Tahu asam / rasa\nmasam",
       "• Cuka terlalu banyak (>50ml/liter)\n• Koagulasi terlalu lama (>15 menit)\n• Air kotor\n• Kedelai over-rendam",
       "• Kurangi takaran cuka ke 30–35ml\n• Batasi waktu koagulasi 5–8 mnt\n• Ganti ke koagulan batu\n• Bilas tahu dengan air bersih setelah cetak",
       "Gunakan air bersih, jangan over-rendam kedelai, ukur koagulan dengan timbangan"],
      ["Tahu pahit / rasa\nlangu",
       "• Susu kedelai tidak direbus sempurna\n• Suhu rebus terlalu rendah (<80°C)\n• Kedelai kurang bersih dicuci\n• Varietas kedelai tertentu",
       "• Pastikan rebus 85–90°C selama 15 mnt\n• Bilas kedelai minimal 3 kali\n• Gunakan kedelai segar berkualitas",
       "Wajib gunakan termometer; jangan kira-kira suhu rebus"],
      ["Tahu lembek / tidak\npadat",
       "• Waktu pres terlalu singkat (<15 mnt)\n• Beban pres tidak cukup\n• Kain saring berlipat\n• Whey belum keluar bersih",
       "• Perpanjang pres minimal 20–30 mnt\n• Tambah beban di atas cetakan\n• Pastikan kain saring rapi & rata\n• Beri lubang pada cetakan agar whey mengalir",
       "Siapkan beban yang cukup, gunakan cetakan berlubang, catat waktu pres"],
      ["Tahu cepat basi /\nberlendir",
       "• Sanitasi alat kurang bersih\n• Air rendaman tidak diganti\n• Suhu penyimpanan terlalu hangat\n• Tahu tidak sepenuhnya matang",
       "• Sanitasi semua alat dengan air panas\n• Ganti air rendaman setiap hari\n• Simpan di kulkas jika tidak habis 1 hari\n• Pastikan koagulasi & pres sempurna",
       "Protokol sanitasi ketat, gunakan wadah tertutup, simpan di kulkas"],
      ["Warna tahu\nkekuningan / kusam",
       "• Kedelai terlalu tua/keriput\n• Air kotor / mengandung besi\n• Kain saring kotor / bernoda\n• Koagulan batu tidak larut sempurna",
       "• Pilih kedelai segar & bersih\n• Gunakan air matang/air galon\n• Cuci kain saring dengan air panas tiap sesi\n• Larutkan koagulan hingga bening sebelum dipakai",
       "Sortasi kedelai ketat, gunakan air bersih, kain saring selalu dicuci"],
    ].map(([masalah, penyebab, solusi, cegah], i) => {
      const bg1 = i%2===0 ? "#FCE4D6" : C.WHITE;
      const bg2 = i%2===0 ? C.WHITE   : C.LLBLUE;
      return new TableRow({ children: [
        tc(masalah,  { fill: bg1, bold: true, size: 17, width: TC2[0] }),
        tc(penyebab, { fill: bg2, size: 17, width: TC2[1] }),
        tc(solusi,   { fill: bg1, size: 17, width: TC2[2] }),
        tc(cegah,    { fill: bg2, size: 17, color: C.DGRAY, italic: true, width: TC2[3] }),
      ]});
    }),
  ]
});

// ── HPP TABLE ──
const HC = [3120, 3120, 3120];
const hppTable = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: HC,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("Komponen Biaya",            HC[0], { fill: C.NAVY }),
      th("Rincian & Estimasi (Rp)",   HC[1], { fill: C.NAVY }),
      th("Catatan / Tips",            HC[2], { fill: C.NAVY }),
    ]}),
    ...[
      ["BAHAN BAKU",
       "Kedelai 1 kg: Rp12.000\nKoagulan batu: Rp500\nGaram: Rp200",
       "Harga kedelai lokal bervariasi Rp10.000–15.000/kg tergantung daerah"],
      ["ENERGI & OPERASIONAL",
       "Gas (1 tabung 3kg ≈ 30 produksi): Rp2.000\nAir bersih: Rp500",
       "Efisiensi gas: rebus bersama, jangan boros nyala api"],
      ["KEMASAN & LABEL",
       "Plastik food-grade: Rp300\nLabel cetak/tulis: Rp200",
       "Beli plastik grosir = lebih hemat 30–40%"],
      ["TENAGA KERJA",
       "Jika sendiri: hitung Rp20.000–30.000 per sesi (4 jam)\nPer produksi = Rp2.000–3.000",
       "Jangan lupa hitung nilai kerja Anda sendiri"],
      ["OVERHEAD (10%)",
       "10% dari total biaya di atas\n≈ Rp1.500–2.000",
       "Untuk alat aus, listrik, internet, dll"],
      ["TOTAL HPP (per produksi 1 kg kedelai)",
       "Estimasi: Rp15.000 – 18.000\nHasil: 8–10 potong tahu",
       "HPP per potong: Rp1.500 – 2.250"],
      ["HARGA JUAL (margin 40%)",
       "Harga jual: Rp2.100 – 3.150 per potong\nAtau dikemas 5 ptg @ Rp10.000–15.000",
       "Sesuaikan dengan harga pasar setempat"],
      ["BEP HARIAN",
       "Biaya tetap harian: Rp30.000\nMargin per potong: Rp700\nBEP: ±43 potong/hari",
       "Produksi 5–6 kg kedelai/hari sudah melampaui BEP"],
    ].map(([komponen, rincian, catatan], i) => {
      const isTotal = komponen.includes("TOTAL") || komponen.includes("HARGA") || komponen.includes("BEP");
      return new TableRow({ children: [
        tc(komponen, { fill: isTotal ? C.NAVY : (i%2===0 ? C.LBLUE : C.LLBLUE), bold: true, size: 18, color: isTotal ? C.WHITE : C.BLACK, width: HC[0] }),
        tc(rincian,  { fill: isTotal ? C.MINT  : C.WHITE, size: 17, bold: isTotal, width: HC[1] }),
        tc(catatan,  { fill: isTotal ? C.MINT  : C.LLBLUE, size: 17, italic: true, color: C.DGRAY, width: HC[2] }),
      ]});
    }),
  ]
});

// ── CATATAN OPERASIONAL TABLE ──
const OC = [540, 8820];
const opTable = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: OC,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("No", OC[0], { fill: C.NAVY }),
      th("Catatan Penting Operasional & Persiapan Penyelenggara", OC[1], { fill: C.NAVY }),
    ]}),
    ...[
      ["1", "RENDAM KEDELAI H-1 (WAJIB): Panitia merendam kedelai 6–8 jam sebelum hari H. Tandai waktu mulai rendam. Jangan melebihi 10 jam (kedelai akan berbau asam). Gunakan air bersih yang sudah berganti, bukan air bekas cucian."],
      ["2", "FOKUS PRODUK UTAMA: Tahu putih adalah produk inti yang wajib dikuasai peserta. Produk turunan (tahu kuning, pong) hanya sebagai demo singkat untuk menunjukkan peluang pengembangan. Jangan tergesa mengajar produk turunan sebelum tahu putih berhasil."],
      ["3", "ALAT WAJIB ADA: 4 set cetakan kayu + kain saring untuk 4 kelompok. Termometer masak (bukan termometer badan!) minimal 2 buah — ini kritis untuk keberhasilan tahu. Timbangan digital minimal 2 unit."],
      ["4", "KOAGULAN 2 JENIS: Siapkan koagulan batu/biangan DAN cuka masak agar peserta bisa membandingkan hasil tekstur secara langsung dalam satu sesi. Takaran: batu 3–5g/liter, cuka 30–40ml/liter."],
      ["5", "LEMBAR KERJA PESERTA (cetak H-1): Minimal 25 lembar (lebih 5 cadangan). Isi: resep baku, tabel catatan suhu & waktu, checklist sanitasi, lembar evaluasi produk, dan template HPP sederhana. Ini adalah oleh-oleh tertulis peserta."],
      ["6", "APD & KESELAMATAN: Siapkan celemek (20 buah), penutup kepala (20 buah), sarung tangan plastik sekali pakai (2 kotak), dan kotak P3K dapur (perban, salep luka bakar, plester). Briefing keselamatan wajib di awal sesi."],
      ["7", "TERMOMETER MASAK: Tanpa termometer, suhu hanya dikira-kira — ini sumber utama kegagalan tahu asam & tidak padat. Jika tidak ada termometer digital, gunakan termometer masak analog yang sudah dikalibrasi."],
      ["8", "SERTIFIKAT & ADMINISTRASI: Cetak sertifikat sebelum hari H (isi nama, tanggal, tanda tangan). Siapkan formulir kepuasan peserta, daftar hadir, dan kuitansi jika ada biaya pendaftaran. Foto bersama dilakukan sesi 14.30–14.45 agar tidak memotong sesi bisnis."],
      ["9", "AIR BERSIH: Pastikan tersedia air bersih yang cukup untuk seluruh proses (merendam, mencuci, merebus, menyimpan tahu). Gunakan air PDAM yang sudah dimasak atau air galon — jangan pakai air sumur langsung."],
      ["10", "PERSIAPAN RUANG: Area dapur bersih, ventilasi cukup, tidak dekat tempat sampah. Siapkan meja evaluasi terpisah untuk presentasi hasil tiap kelompok. Sediakan wadah untuk ampas kedelai (okara) agar tidak berserakan."],
    ].map(([no, isi], i) =>
      new TableRow({ children: [
        tc(no,  { fill: i%2===0 ? C.LBLUE  : C.LLBLUE, bold: true, size: 19, align: AlignmentType.CENTER, width: OC[0], vAlign: VerticalAlign.CENTER }),
        tc(isi, { fill: i%2===0 ? C.LLBLUE : C.WHITE,  size: 18, width: OC[1] }),
      ]})
    ),
  ]
});

// ── ALAT BAHAN TABLE ──
const AC = [1800, 4500, 1080, 1980];
const alatTable = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: AC,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("Kategori",       AC[0], { fill: C.TEAL }),
      th("Item",           AC[1], { fill: C.TEAL }),
      th("Jumlah",         AC[2], { fill: C.TEAL }),
      th("Keterangan",     AC[3], { fill: C.TEAL }),
    ]}),
    ...[
      ["Peralatan Utama", "Blender / mesin giling kedelai", "1–2 unit", "Kapasitas min. 1 liter/batch"],
      ["", "Panci besar (min. 10 liter)", "4 unit", "1 per kelompok"],
      ["", "Kompor + tabung gas 3 kg", "2–4 tungku", "Cukup untuk 4 kelompok"],
      ["", "Cetakan kayu tahu + tutup", "4 set", "Ukuran standar 20×20 cm"],
      ["", "Kain saring/muslin bersih", "4–8 lembar", "Cadangan 2 lembar per kelompok"],
      ["", "Termometer masak (digital/analog)", "2 unit", "WAJIB ADA — kritis untuk tahu berhasil"],
      ["", "Timbangan digital", "2 unit", "Ketelitian 1 gram"],
      ["", "Sendok kayu / spatula besar", "4–8 buah", "1–2 per kelompok"],
      ["", "Baskom besar (5–10 liter)", "8 buah", "2 per kelompok"],
      ["", "Pisau + talenan bersih", "4 set", "1 per kelompok"],
      ["", "Sendok berlubang / skimmer", "4 buah", "Untuk pindah gumpalan ke cetakan"],
      ["", "Wadah penyimpanan bertutup", "4–8 buah", "Untuk simpan tahu hasil praktik"],
      ["Bahan Produksi", "Kedelai segar berkualitas", "±5 kg", "Sudah direndam H-1 (6–8 jam)"],
      ["", "Koagulan batu / kalsium sulfat", "100 gram", "Untuk semua kelompok"],
      ["", "Cuka masak / cuka makanan", "500 ml", "Untuk perbandingan antar kelompok"],
      ["", "Garam dapur bersih", "100 gram", "Opsional, untuk uji rasa"],
      ["", "Air bersih / air galon", "Cukup", "Untuk proses & penyimpanan"],
      ["", "Kunyit bubuk / segar (opsional)", "50 gram", "Untuk demo tahu kuning"],
      ["APD & Keselamatan", "Celemek kain / plastik", "20 buah", "1 per peserta"],
      ["", "Penutup kepala / hair net", "20 buah", "1 per peserta"],
      ["", "Sarung tangan plastik sekali pakai", "2 kotak", "±100 pasang"],
      ["", "Kotak P3K dapur lengkap", "1 set", "Luka bakar, luka iris, plester"],
      ["", "Sabun cuci tangan & lap bersih", "Cukup", "Di tiap area wastafel"],
      ["Administrasi", "Lembar kerja peserta (cetak)", "25 lembar", "Termasuk cadangan 5 lembar"],
      ["", "Formulir evaluasi & daftar hadir", "25 lembar", "Cetak H-1"],
      ["", "Sertifikat peserta (cetak)", "20 lembar", "Isi nama sebelum hari H"],
      ["", "Alat tulis (pulpen, spidol)", "Cukup", "Untuk kelompok & fasilitator"],
      ["", "Plastik food-grade PP/HDPE", "50 lembar", "Untuk sesi kemas"],
      ["", "Label / stiker kosong", "1 rol", "Untuk latihan membuat label"],
      ["", "Marker / spidol untuk label", "4 buah", "1 per kelompok"],
    ].map(([kat, item, jml, ket], i) => {
      const isCat = kat !== "";
      return new TableRow({ children: [
        tc(kat,  { fill: isCat ? C.LBLUE : C.LLBLUE, bold: isCat, size: 18, width: AC[0], vAlign: VerticalAlign.CENTER }),
        tc(item, { fill: i%2===0 ? C.WHITE : C.LLBLUE, size: 18, width: AC[1], bold: item.includes("WAJIB") }),
        tc(jml,  { fill: i%2===0 ? C.WHITE : C.LLBLUE, size: 18, align: AlignmentType.CENTER, width: AC[2] }),
        tc(ket,  { fill: i%2===0 ? C.WHITE : C.LLBLUE, size: 17, italic: true, color: C.DGRAY, width: AC[3] }),
      ]});
    }),
  ]
});

// ── POST-TEST TABLE ──
const QC = [600, 7560, 1200];
const postTestTable = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: QC,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("No",       QC[0], { fill: C.TEAL }),
      th("Pertanyaan Post-Test", QC[1], { fill: C.TEAL }),
      th("Jawaban",  QC[2], { fill: C.TEAL }),
    ]}),
    ...[
      ["1", "Berapa suhu ideal untuk merebus susu kedelai agar tidak bau langu?", "85 – 90 °C"],
      ["2", "Pada suhu berapa koagulan sebaiknya dimasukkan ke dalam susu kedelai?", "70 – 75 °C"],
      ["3", "Berapa lama minimum waktu pres tahu agar hasilnya padat?", "20 – 30 menit"],
      ["4", "Jika tahu hasil praktik Anda terasa asam, apa kemungkinan penyebabnya? (sebutkan 2)", "Cuka terlalu banyak / koagulasi terlalu lama"],
      ["5", "Apa bedanya koagulan tahu batu dan cuka dari segi hasil tekstur?", "Batu = lebih padat & tidak asam; Cuka = agak kenyal & sedikit asam"],
      ["6", "Sebutkan minimal 3 APD yang wajib dipakai saat membuat tahu secara higienis!", "Celemek, penutup kepala, sarung tangan"],
      ["7", "Bagaimana cara menyimpan tahu putih agar tahan 3 hari di suhu ruang?", "Rendam air bersih dalam wadah tertutup, ganti air tiap hari"],
      ["8", "Jika HPP per potong tahu adalah Rp2.000 dan margin yang diinginkan 40%, berapa harga jualnya?", "Rp2.800"],
      ["9", "Apa yang harus dicantumkan minimal pada label kemasan tahu UMKM?", "Nama produk, berat, tanggal produksi, kontak"],
      ["10", "Sebutkan 2 tanda tahu sudah tidak layak konsumsi!", "Berlendir + bau asam menyengat / warna kehijauan"],
    ].map(([no, soal, jwb], i) =>
      new TableRow({ children: [
        tc(no,   { fill: i%2===0 ? C.TEALLT : C.WHITE, bold: true, size: 18, align: AlignmentType.CENTER, width: QC[0], vAlign: VerticalAlign.CENTER }),
        tc(soal, { fill: i%2===0 ? C.WHITE  : C.TEALLT, size: 18, width: QC[1] }),
        tc(jwb,  { fill: i%2===0 ? C.MINT   : C.WHITE, size: 17, italic: true, color: C.DGRAY, width: QC[2] }),
      ]})
    ),
  ]
});

// ── EVALUASI PELATIHAN TABLE ──
const EVC = [3000, 3180, 3180];
const evalTable = new Table({
  width: { size: CWP, type: WidthType.DXA },
  columnWidths: EVC,
  rows: [
    new TableRow({ tableHeader: true, children: [
      th("Aspek Evaluasi",   EVC[0], { fill: C.NAVY }),
      th("Indikator Keberhasilan",  EVC[1], { fill: C.NAVY }),
      th("Instrumen / Cara Ukur",   EVC[2], { fill: C.NAVY }),
    ]}),
    ...[
      ["Pengetahuan (Kognitif)",
       "Peserta mampu menjawab minimal 7 dari 10 soal post-test dengan benar",
       "Post-test tertulis 10 soal (isian singkat) di akhir pelatihan"],
      ["Keterampilan (Psikomotorik)",
       "Tahu putih yang dihasilkan padat, tidak asam, tidak hancur, warna putih bersih",
       "Penilaian produk oleh fasilitator menggunakan lembar evaluasi 4 kriteria"],
      ["Sikap (Afektif)",
       "Peserta aktif dalam diskusi, mengikuti prosedur sanitasi, dan memberikan feedback konstruktif",
       "Observasi langsung oleh fasilitator selama praktik berlangsung"],
      ["Kepuasan Peserta",
       "Rata-rata skor kepuasan ≥ 4 dari skala 5 (sangat puas)",
       "Formulir kepuasan peserta (5 aspek, skala Likert 1–5) diisi di akhir"],
      ["Rencana Tindak Lanjut",
       "Setiap peserta menuliskan target produksi & penjualan tahu dalam 2 minggu ke depan",
       "Lembar RTL individu dikumpulkan sebelum sertifikat dibagikan"],
    ].map(([aspek, indikator, instrumen], i) =>
      new TableRow({ children: [
        tc(aspek,      { fill: i%2===0 ? C.LBLUE  : C.LLBLUE, bold: true, size: 18, width: EVC[0] }),
        tc(indikator,  { fill: i%2===0 ? C.MINT   : C.WHITE,  size: 18, width: EVC[1] }),
        tc(instrumen,  { fill: i%2===0 ? C.LLBLUE : C.WHITE,  size: 17, italic: true, color: C.DGRAY, width: EVC[2] }),
      ]})
    ),
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// ██████████████████ BUILD DOCUMENT ████████████████████████████████████
// ═══════════════════════════════════════════════════════════════════════

const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: "Arial", color: C.NAVY },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, font: "Arial", color: C.BLUE },
        paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: C.TEAL },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ]
  },

  sections: [
    // ═══════════════════════════
    // SECTION 1: LANDSCAPE — Jadwal, Info Umum, Cover
    // ═══════════════════════════
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        }
      },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: [
        // ── COVER / JUDUL ──
        gap(200),
        p([run("SILABUS PELATIHAN KILAT", { bold: true, size: 48, color: C.NAVY })],
          { align: AlignmentType.CENTER, before: 0, after: 60 }),
        p([run("Membuat Tahu Higienis Skala Rumah Tangga", { bold: true, size: 36, color: C.BLUE })],
          { align: AlignmentType.CENTER, before: 0, after: 80 }),

        // Info strip
        new Table({
          width: { size: CW, type: WidthType.DXA },
          columnWidths: [Math.floor(CW/4), Math.floor(CW/4), Math.floor(CW/4), CW - 3*Math.floor(CW/4)],
          rows: [new TableRow({ children: [
            tc([p("DURASI", { bold: true, size: 17, color: C.WHITE, align: AlignmentType.CENTER, before: 20, after: 8 }),
                p("1 Hari · 8 JP", { size: 22, bold: true, color: C.WHITE, align: AlignmentType.CENTER, before: 0, after: 20 })],
               { fill: C.NAVY, borders: bNone, width: Math.floor(CW/4), vAlign: VerticalAlign.CENTER }),
            tc([p("PESERTA", { bold: true, size: 17, color: C.WHITE, align: AlignmentType.CENTER, before: 20, after: 8 }),
                p("15–20 Orang", { size: 22, bold: true, color: C.WHITE, align: AlignmentType.CENTER, before: 0, after: 20 })],
               { fill: C.BLUE, borders: bNone, width: Math.floor(CW/4), vAlign: VerticalAlign.CENTER }),
            tc([p("TARGET PESERTA", { bold: true, size: 17, color: C.WHITE, align: AlignmentType.CENTER, before: 20, after: 8 }),
                p("Umum · UMKM · Pemula", { size: 18, bold: true, color: C.WHITE, align: AlignmentType.CENTER, before: 0, after: 20 })],
               { fill: C.TEAL, borders: bNone, width: Math.floor(CW/4), vAlign: VerticalAlign.CENTER }),
            tc([p("TUJUAN UMUM", { bold: true, size: 17, color: C.NAVY, align: AlignmentType.CENTER, before: 20, after: 8 }),
                p("Peserta mampu membuat tahu putih yang padat & tidak asam dalam 1 hari pelatihan", { size: 18, color: C.NAVY, align: AlignmentType.CENTER, before: 0, after: 20 })],
               { fill: C.LBLUE, borders: bNone, width: CW - 3*Math.floor(CW/4), vAlign: VerticalAlign.CENTER }),
          ]})]
        }),

        gap(240),

        // ── JADWAL UTAMA ──
        h1("1. Jadwal Pelatihan (Ringkasan per Sesi)"),
        p([run("Keterangan: item bertanda ", { size: 18 }),
           run("[BARU]", { bold: true, size: 18, color: "2E7D32" }),
           run(" adalah materi tambahan dari hasil revisi dan penyempurnaan silabus.", { size: 18 })],
          { before: 0, after: 120 }),
        jadwalTable,
        gap(160),
      ]
    },

    // ═══════════════════════════
    // SECTION 2: PORTRAIT — Detail Materi, Standar, Trouble, HPP, Alat, Post-test, Evaluasi
    // ═══════════════════════════
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        }
      },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: [

        // ── TUJUAN PEMBELAJARAN ──
        h1("2. Tujuan Pembelajaran"),
        h2("2.1 Tujuan Umum"),
        p("Setelah mengikuti pelatihan ini, peserta mampu membuat tahu putih yang higienis, padat, tidak asam, dan tidak mudah hancur dalam skala rumah tangga, serta memahami dasar-dasar usaha tahu sederhana.",
          { size: 19, before: 40, after: 80 }),
        h2("2.2 Tujuan Khusus"),
        bul("Menjelaskan prinsip dasar biokimia pembuatan tahu dan perbedaan jenis koagulan"),
        bul("Mempraktikkan proses pembuatan susu kedelai sesuai standar suhu & waktu yang benar"),
        bul("Mencetak tahu putih yang padat dengan teknik koagulasi yang tepat"),
        bul("Mengidentifikasi dan memberikan solusi terhadap masalah umum dalam pembuatan tahu"),
        bul("Menerapkan prinsip sanitasi dan higienitas dalam proses produksi pangan"),
        bul("Mengemas tahu secara higienis dan menarik dengan label UMKM minimal"),
        bul("Menghitung HPP, menentukan harga jual, dan mensimulasikan BEP usaha tahu rumahan"),
        bul("Menyusun Rencana Tindak Lanjut (RTL) produksi dan pemasaran tahu"),
        gap(160),

        // ── DETAIL MATERI ──
        h1("3. Uraian Materi Lengkap per Sesi"),
        p("Tabel berikut menguraikan materi secara detail untuk setiap sesi pelatihan. Fasilitator wajib menguasai seluruh isi materi di bawah ini sebelum hari pelaksanaan.",
          { size: 19, before: 40, after: 120 }),
        materiDetail,
        gap(160),

        bp(),

        // ── STANDAR BAKU ──
        h1("4. Tabel Standar Baku Proses Produksi"),
        p("Tabel ini adalah RUJUKAN UTAMA fasilitator saat evaluasi dan troubleshooting. Bagikan juga kepada peserta sebagai bagian dari lembar kerja.",
          { size: 19, before: 40, after: 120, bold: false }),
        standardTable,
        gap(160),

        // ── TROUBLESHOOTING ──
        h1("5. Panduan Troubleshooting (Bedah Masalah)"),
        p("Gunakan tabel ini saat sesi Evaluasi & Troubleshooting (13.00–14.00). Fasilitator memandu peserta mengidentifikasi masalah pada tahu hasil praktik, mencari akar penyebab, dan mendiskusikan solusi bersama.",
          { size: 19, before: 40, after: 120 }),
        troubleTable,
        gap(160),

        bp(),

        // ── HPP ──
        h1("6. Panduan Hitung HPP, Harga Jual & BEP"),
        p("Angka-angka di bawah adalah estimasi ilustrasi. Fasilitator WAJIB menyesuaikan dengan harga bahan baku aktual di daerah masing-masing sebelum hari H pelatihan.",
          { size: 19, before: 40, after: 80, italic: true }),
        hppTable,
        gap(80),
        p([run("Catatan: ", { bold: true, size: 18 }),
           run("Simulasi di atas menggunakan asumsi harga kedelai Rp12.000/kg. Harga aktual bervariasi di setiap daerah. Fasilitator disarankan melakukan survei harga kedelai dan gas di pasar setempat minimal 3 hari sebelum pelatihan.", { size: 18 })],
          { before: 40, after: 40 }),
        gap(160),

        // ── CATATAN OPERASIONAL ──
        h1("7. Catatan Penting Operasional"),
        p("Berikut adalah hal-hal kritis yang wajib dipersiapkan penyelenggara sebelum dan pada hari pelaksanaan pelatihan.",
          { size: 19, before: 40, after: 120 }),
        opTable,
        gap(160),

        bp(),

        // ── ALAT & BAHAN ──
        h1("8. Daftar Kebutuhan Alat & Bahan"),
        p("Pastikan semua alat dan bahan sudah siap sebelum hari H. Item yang perlu dibeli atau dipinjam sebaiknya dikonfirmasi minimal 3 hari sebelum pelatihan.",
          { size: 19, before: 40, after: 120 }),
        alatTable,
        gap(160),

        // ── POST-TEST ──
        h1("9. Soal Post-Test (10 Soal Isian Singkat)"),
        p("Post-test dilaksanakan di akhir pelatihan (sesi 14.45–16.00). Peserta mengerjakan secara mandiri, kemudian dibahas bersama. Target minimum: 7 benar dari 10 soal.",
          { size: 19, before: 40, after: 80 }),
        p([run("Kunci jawaban ", { bold: true, size: 18 }),
           run("tersedia di kolom kanan (tidak ditampilkan ke peserta — hanya untuk fasilitator).", { size: 18 })],
          { before: 0, after: 120 }),
        postTestTable,
        gap(160),

        bp(),

        // ── EVALUASI PELATIHAN ──
        h1("10. Rencana Evaluasi Pelatihan"),
        p("Evaluasi dilakukan secara holistik menggunakan 5 instrumen berbeda untuk memastikan keberhasilan pelatihan dari aspek pengetahuan, keterampilan, sikap, kepuasan, dan keberlanjutan.",
          { size: 19, before: 40, after: 120 }),
        evalTable,
        gap(100),

        h2("10.1 Lembar Penilaian Produk Tahu (Per Kelompok)"),
        p("Fasilitator menilai tahu putih hasil praktik tiap kelompok menggunakan 4 kriteria berikut (skor 1–5 tiap kriteria, total maksimal 20):",
          { size: 19, before: 40, after: 80 }),
        new Table({
          width: { size: CWP, type: WidthType.DXA },
          columnWidths: [2340, 2340, 2340, 2340],
          rows: [
            new TableRow({ tableHeader: true, children: [
              th("Kriteria", 2340, { fill: C.NAVY }),
              th("Skor 1–2 (Kurang)", 2340, { fill: C.NAVY }),
              th("Skor 3 (Cukup)", 2340, { fill: C.NAVY }),
              th("Skor 4–5 (Baik)", 2340, { fill: C.NAVY }),
            ]}),
            ...[
              ["Tekstur / Kepadatan", "Mudah hancur, terlalu lembek", "Agak padat, sedikit rapuh", "Padat, tidak hancur ditekan, konsisten"],
              ["Rasa", "Sangat asam atau sangat pahit", "Sedikit asam atau sedikit pahit", "Netral, tidak asam, tidak pahit, segar"],
              ["Warna", "Kekuningan, kusam, tidak merata", "Putih agak kekuningan", "Putih bersih dan merata"],
              ["Kebersihan / Higienitas", "Ada bercak, bau asing, kotor", "Cukup bersih, tidak berbau menyengat", "Bersih, tidak berbau, bebas kontaminan"],
            ].map(([kr, s12, s3, s45], i) =>
              new TableRow({ children: [
                tc(kr,  { fill: i%2===0 ? C.LBLUE  : C.LLBLUE, bold: true, size: 18, width: 2340 }),
                tc(s12, { fill: i%2===0 ? "#FCE4D6": C.WHITE,   size: 17, width: 2340 }),
                tc(s3,  { fill: i%2===0 ? C.YELLOW : C.LLBLUE,  size: 17, width: 2340 }),
                tc(s45, { fill: i%2===0 ? C.MINT   : C.WHITE,   size: 17, width: 2340 }),
              ]})
            ),
          ]
        }),
        gap(160),

        // ── REFERENSI & PENUTUP ──
        h1("11. Referensi & Penutup"),
        h2("11.1 Referensi Ilmiah & Praktis"),
        bul("Badan Standardisasi Nasional (BSN). SNI 01-3142-1998: Syarat Mutu Tahu. Jakarta: BSN."),
        bul("BPOM RI. Peraturan tentang Keamanan Pangan Olahan Skala Rumah Tangga (P-IRT)."),
        bul("Koswara, S. (2011). Teknologi Pengolahan Kedelai: Membuat Tempe, Oncom, Susu Kedelai, dan Tahu. Pustaka Sinar Harapan: Jakarta."),
        bul("Astawan, M. (2009). Panduan Pangan Fungsional: Kedelai dan Manfaatnya. IPB Press: Bogor."),
        bul("Kementerian Pertanian RI. Data konsumsi dan produksi kedelai nasional (diperbarui tiap tahun di website Kementan)."),
        gap(100),
        h2("11.2 Penutup Silabus"),
        p("Silabus ini merupakan dokumen panduan resmi yang wajib dikuasai oleh fasilitator dan panitia penyelenggara sebelum hari pelaksanaan pelatihan. Seluruh bagian — mulai dari jadwal, materi, standar baku, troubleshooting, HPP, alat bahan, post-test, hingga evaluasi — dirancang sebagai satu kesatuan yang saling mendukung untuk memastikan peserta dapat memproduksi tahu higienis secara mandiri setelah pelatihan.",
          { size: 19, before: 40, after: 80 }),
        p("Penyelenggara diperbolehkan melakukan penyesuaian pada bagian estimasi HPP sesuai harga bahan baku aktual di daerah masing-masing. Namun, standar baku proses (suhu, waktu, takaran koagulan) TIDAK boleh diubah tanpa kajian teknis, karena memengaruhi keamanan dan kualitas produk pangan.",
          { size: 19, before: 0, after: 80 }),
        p([run("Selamat melaksanakan pelatihan. Semoga peserta berhasil menjadi produsen tahu higienis yang menguntungkan!", { bold: true, size: 20, color: C.NAVY })],
          { align: AlignmentType.CENTER, before: 160, after: 0 }),
        gap(80),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("silabus_pelatihan_tahu_lengkap.docx", buffer);
  console.log("DONE");
}).catch(err => console.error(err));