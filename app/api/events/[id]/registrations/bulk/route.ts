import { NextRequest, NextResponse } from "next/server";
import { createRegistration, checkCustomerByEmail, createCustomer, checkRegistration } from "@/lib/eventRegistrations";
import { getPublicEventById } from "@/lib/events";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

type ParsedRow = {
  row: number;
  full_name: string;
  phone_number: string;
  email: string;
  business_name?: string;
  is_valid: boolean;
  invalid_reason?: string;
};

function detectDelimiter(csvText: string): string {
  const firstLine = csvText.split("\n")[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? "\t" : ",";
}

function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const cleanText = csvText.replace(/^\uFEFF/, "").replace(/^\xEF\xBB\xBF/, "");
  const delimiter = detectDelimiter(cleanText);
  const lines = cleanText.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(parseLine);
  
  return { headers, rows };
}

function normalizeEmail(email: string): string {
  if (!email) return "";
  let normalized = email.trim().toLowerCase();
  if (normalized.includes("@") && !normalized.includes(".")) {
    normalized = normalized.replace(/@(\w+)/, "@$1.com");
  }
  if (normalized.includes("@") && normalized.split("@")[1].includes("gmail")) {
    normalized = normalized.replace(/gmail\.?com?$/, "gmail.com");
  }
  return normalized;
}

function validateEmail(email: string): { valid: boolean; reason?: string } {
  if (!email || email.trim() === "") {
    return { valid: false, reason: "Email kosong" };
  }
  
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(normalized)) {
    return { valid: false, reason: `Format email tidak valid` };
  }
  
  const [local, domain] = normalized.split("@");
  if (!local || !domain) {
    return { valid: false, reason: `Format email tidak valid` };
  }
  
  if (domain.length < 3 || !domain.includes(".")) {
    return { valid: false, reason: `Format email tidak valid` };
  }
  
  return { valid: true };
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const cleanedHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, ""));
  
  for (const name of possibleNames) {
    const normalizedName = name.toLowerCase().replace(/[\s_-]/g, "");
    
    const idx = cleanedHeaders.findIndex(h => 
      h === normalizedName ||
      h.includes(normalizedName) ||
      normalizedName.includes(h) ||
      h.replace(/[\s_-]/g, "") === normalizedName.replace(/[\s_-]/g, "")
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { id: eventId } = await params;
    const formData = await request.formData();
    const action = formData.get("action") as string | null;
    const csvFile = formData.get("file") as File | null;

    if (!csvFile) {
      return NextResponse.json(
        { error: "File CSV wajib diupload" },
        { status: 400 }
      );
    }

    const csvText = await csvFile.text();
    
    // Debug logging
    console.log('[BULK IMPORT] File name:', csvFile.name);
    console.log('[BULK IMPORT] First 100 chars:', csvText.substring(0, 100).replace(/\n/g, '\\n'));
    console.log('[BULK IMPORT] Has BOM:', csvText.charCodeAt(0) === 0xFEFF);
    
    const { headers, rows } = parseCSV(csvText);
    
    console.log('[BULK IMPORT] Parsed headers:', headers);
    console.log('[BULK IMPORT] Parsed rows count:', rows.length);
    console.log('[BULK IMPORT] First row:', rows[0]);
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang ditemukan di CSV" },
        { status: 400 }
      );
    }

    const nameIdx = findColumnIndex(headers, ["nama", "full_name", "name", "nama lengkap"]);
    const emailIdx = findColumnIndex(headers, ["email", "e-mail"]);
    const phoneIdx = findColumnIndex(headers, ["no telf", "phone_number", "phone", "no_telf", "no_hp", "hp", "notelp", "telp"]);
    const businessIdx = findColumnIndex(headers, ["business_name", "nama usaha", "usaha", "brand", "nama_usaha"]);

    if (nameIdx === -1 || emailIdx === -1) {
      return NextResponse.json(
        { 
          error: "Header CSV harus mengandung kolom 'nama' dan 'email'",
          debug: {
            parsed_headers: headers,
            cleaned_headers: headers.map(h => h.toLowerCase().trim()),
            delimiter,
            total_rows: rows.length,
            first_row: rows[0] || []
          }
        },
        { status: 400 }
      );
    }

    // Parse all rows
    const parsedRows: ParsedRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const values = rows[i];
      const rowNum = i + 2;
      
      const full_name = (values[nameIdx] || "").trim();
      const email = normalizeEmail((values[emailIdx] || "").trim());
      const phone_number = phoneIdx !== -1 ? (values[phoneIdx] || "").trim() : "";
      const business_name = businessIdx !== -1 ? (values[businessIdx] || "").trim() : "";
      
      const emailValidation = validateEmail(email);
      
      const row: ParsedRow = {
        row: rowNum,
        full_name,
        phone_number,
        email,
        business_name: business_name || undefined,
        is_valid: false,
        invalid_reason: undefined
      };
      
      if (!full_name) {
        row.invalid_reason = "Nama kosong";
      } else if (!emailValidation.valid) {
        row.invalid_reason = emailValidation.reason;
      } else {
        row.is_valid = true;
      }
      
      parsedRows.push(row);
    }

    // Preview mode
    if (action === "preview") {
      const validRows = parsedRows.filter(r => r.is_valid);
      const invalidRows = parsedRows.filter(r => !r.is_valid);
      
      return NextResponse.json({
        valid_count: validRows.length,
        invalid_count: invalidRows.length,
        valid_rows: validRows.map(r => ({
          row: r.row,
          full_name: r.full_name,
          email: r.email,
          phone_number: r.phone_number,
          business_name: r.business_name
        })),
        invalid_rows: invalidRows
      });
    }

    // Import mode
    if (!csvFile.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File harus format CSV" },
        { status: 400 }
      );
    }

    const event = await getPublicEventById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: "Event tidak ditemukan" },
        { status: 404 }
      );
    }

    const results: { row: number; success: boolean; full_name: string; email: string; message: string }[] = [];
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const row of parsedRows) {
      if (!row.is_valid) {
        results.push({
          row: row.row,
          success: false,
          full_name: row.full_name,
          email: row.email,
          message: row.invalid_reason || "Data tidak valid"
        });
        failCount++;
        continue;
      }

      const existingReg = await checkRegistration(eventId, row.email);
      if (existingReg.is_registered) {
        results.push({
          row: row.row,
          success: false,
          full_name: row.full_name,
          email: row.email,
          message: "Email sudah terdaftar di event ini"
        });
        skipCount++;
        continue;
      }

      let processedPhone = row.phone_number.replace(/[\s\-+()]/g, "");
      if (processedPhone.length < 10) {
        processedPhone = "08" + processedPhone.replace(/\D/g, "").slice(0, 11);
      }

      try {
        const { exists } = await checkCustomerByEmail(row.email);
        let isNewUser = false;

        if (!exists) {
          await createCustomer({
            full_name: row.full_name,
            email: row.email,
            phone_number: processedPhone,
            corporate_name: row.business_name,
          });
          isNewUser = true;
        }

        await createRegistration({
          event_id: eventId,
          full_name: row.full_name,
          phone_number: processedPhone,
          email: row.email,
          business_name: row.business_name,
        });

        results.push({
          row: row.row,
          success: true,
          full_name: row.full_name,
          email: row.email,
          message: isNewUser ? "Berhasil didaftarkan (user baru)" : "Berhasil didaftarkan"
        });
        successCount++;
      } catch (err) {
        results.push({
          row: row.row,
          success: false,
          full_name: row.full_name,
          email: row.email,
          message: err instanceof Error ? err.message : "Terjadi kesalahan"
        });
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total_rows: parsedRows.length,
      success_count: successCount,
      fail_count: failCount,
      skip_count: skipCount,
      results,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}