-- Create partners table for CRM data
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  no INTEGER NOT NULL,
  partner TEXT NOT NULL,
  tipe TEXT NOT NULL,
  kontak TEXT,
  pic_mw TEXT,
  status TEXT,
  next_to_do TEXT,
  notes TEXT,
  progress_percentage INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  last_contact_date DATE,
  expected_completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_partners_tipe ON partners(tipe);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_pic_mw ON partners(pic_mw);
CREATE INDEX IF NOT EXISTS idx_partners_priority ON partners(priority);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data from partner.md
INSERT INTO partners (no, partner, tipe, kontak, pic_mw, status, next_to_do) VALUES
(1, 'Rumah BUMN with Yayasan BUMN', 'goverment', 'Syaufan', '', '-', ''),
(2, 'WPMI (Wanita Pengusaha Muslimah Indonesia)', 'association', '', 'Mas Dimas', 'Partner with SMESCO - training 75 person', 'Kompak Tangsel visit kantor 21 Januari'),
(3, 'MOM Academy', 'association', 'Mak Widya', 'Mas Erik', '-', ''),
(4, 'SUMU', 'association', '', 'Mas Erik', '-', ''),
(5, 'SWAKARTA', 'association', '', 'Mas Erik', 'PKS (signed)', ''),
(6, 'APKJ (asosiasi Pengusaha Kreatif Kaya Jogja)', 'association', '', 'Mas Erik', 'Sudah di FU', ''),
(7, 'Eka Foundation', 'foundations', 'Mbak Eka', 'Mas Erik', '-', ''),
(8, 'POS Qasir', 'commercial', 'Novan', 'Mas Dimas', '-', ''),
(9, 'Danone', 'commercial', '', 'Mas Gumi', '', 'Fu buat bertemu'),
(10, 'BRI', 'commercial', 'Mas Benny', 'Mas Erik', 'Proposal + Pelatihan di Rumah BUMN Slipi', 'Perlu ada dokumentasi/ report yang bagus'),
(11, 'ABDSI', 'association', '', 'sudah ada WA', '-', '-'),
(12, 'Ademos Bojonegoro', 'association', 'Arsyad', 'Kang Riqsa/Mas Fauzi', '-', 'sudah fu hari sabtu pagi, untuk concall'),
(13, 'Genpro Sukabumi', 'association', '', 'Kang Riqsa', '-', ''),
(14, 'KDMP Pontianak', 'association', '', 'Mas Erik', '-', 'sudah concall'),
(15, 'Gekrafs Kalbar', 'association', 'Iqbal', 'Mas Dimas', 'PKS (onhold)', 'Masih menunggu review PKS'),
(16, 'Mada', 'foundations', 'Mada', 'Mas Erik', '', 'mau masuk dana CSR, lewat yayasan PKS/ Dompet Dhuafa.'),
(17, 'PHRI', 'association', 'Erwin', 'Mas Erik', 'PR Cara Penggunaan CreateWhiz', ''),
(18, 'UOB - FinLab Indonesia', 'commercial', 'Ibu Maya', 'Mas Erik', '', 'Di FU oleh Mas Gumi'),
(19, 'JNE', 'commercial', '', 'Mas Erik', '', 'Senin Ketemu Pak Eri'),
(20, 'Pemda DKI PPUKM - Jakpreneur', 'goverment', 'Ishak', 'Mas Dimas', 'Request offline Demo', 'Fu buat Demo'),
(21, 'Staff Khusus Presiden Bidang Usaha Mikro, Kecil, dan Menengah, Ekonomi Kreatif dan Digital', 'goverment', 'Yopi', 'Mas Dimas', 'Collaboration 2026 meeting', 'Fu buat bertemu align program'),
(22, 'Evermos - komunitas Imers (internet marketers)', 'commercial', '', 'Mas Kreshna/ Mas Erik', '', 'FU meeting di Jkt'),
(23, 'Utusan Khusus Presiden Bidang Ekonomi Kerakyatan, UMKM, dan Teknologi Digital', 'goverment', 'Dimas', 'Mas Dimas', 'Collaboration 2026 meeting', 'Fu buat bertemu align program'),
(24, 'Soka', 'commercial', 'Helma', 'Mas Erik', '', 'Dana CSR untuk Distributor SOKA'),
(25, 'KPMI', 'association', '', '', '-', ''),
(26, 'ASTRA Foundation', 'foundations', 'Grace Eva', 'Mas Dimas', 'Intro Meeting', 'Fu buat bertemu'),
(27, 'Ekrafs Bogor', 'association', 'Mas Roby', 'Mas Rama', '', 'Fu minggu depan'),
(28, 'ASEAN (AIM for Asean)', 'foundations', 'Eci Ernawati', 'Mas Dimas', 'Request Demo Aplikasi', 'Fu buat Demo'),
(29, 'Pemda Sumedang - Dinas UMKM', 'goverment', 'Agus Kadis', 'Mas Dimas', 'Follow-up Program & MoU', 'Fu ke Kadis dan info ke WaBup (tgl 5 Feb)'),
(30, 'OMG!', 'commercial', 'Yoris Sebastian', 'Mas Dimas', 'Follow-up Program untuk impact+', 'Fu buat Demo'),
(31, 'Maybank', 'commercial', 'Rara', 'Mas Dimas', 'Follow-up Program untuk impact+', 'Fu buat Demo'),
(32, 'UPI Sumedang', 'university', 'Kang Oman', 'Mas Dimas', 'Follow-up Program untuk langganan aplikasi', 'Bikin Modul align dengan matkul di kampus + Dashboard Partners'),
(33, 'APINDO', 'association', 'Faisol', 'Mas Erik', '-', ''),
(34, 'OLDO', 'commercial', '', 'Mas Erik', 'PKS', ''),
(35, 'Finance Expo (Deputi Kecil UMKM)', 'goverment', '', 'Mas Erik', '', ''),
(36, 'BISLAF (Bisnis Layak Funding) (Deputi Kecil UMKM)', 'goverment', '', 'Mas Erik', '', 'Persiapkan Finance'),
(37, 'Bersih Hijau', 'foundations', 'Andhika', 'Mas Erik', 'PKS', ''),
(38, 'Cetta Trans Digital', 'commercial', 'Azmi', 'Mas Erik', 'PKS', 'Kolaborasi dengan XL Provider'),
(39, 'Digital Prosperity Asia', 'association', 'Issac Liu', 'Mas Dimas', 'MWX already Member in DPA', 'Proggram collaboration for Southeast Asia Market'),
(40, '11thSpace', 'commercial', 'Florenzo', 'Mas Dimas', 'Add MWX Academy into their incubation programme', 'FU meeting dengan Programme Manager');
