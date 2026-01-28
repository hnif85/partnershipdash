import { NextRequest, NextResponse } from "next/server";
import { executeQuery, executeQuerySingle } from "@/lib/database";

type ExcludedEmail = {
  id?: number;
  email: string;
  reason: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    let query = `
      SELECT email, reason, is_active, created_at, updated_at
      FROM public.demo_excluded_emails
    `;

    let countQuery = `SELECT COUNT(*) as total FROM public.demo_excluded_emails`;

    const params: any[] = [];
    const countParams: any[] = [];

    if (search) {
      query += ` WHERE email ILIKE $1 OR reason ILIKE $1`;
      countQuery += ` WHERE email ILIKE $1 OR reason ILIKE $1`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [emails, countResult] = await Promise.all([
      executeQuery<ExcludedEmail>(query, params),
      executeQuerySingle<{ total: number }>(countQuery, countParams)
    ]);

    const total = countResult?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    });
  } catch (error) {
    console.error("Error fetching excluded emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch excluded emails" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, emails, reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    // Handle bulk insert
    if (emails && emails.trim()) {
      const emailList = emails.split('\n')
        .map((e: string) => e.trim())
        .filter((e: string) => e.length > 0);

      if (emailList.length === 0) {
        return NextResponse.json(
          { error: "No valid emails provided" },
          { status: 400 }
        );
      }

      // Check for duplicates
      const placeholders = emailList.map((_: string, i: number) => `$${i + 1}`).join(',');
      const existingQuery = `SELECT email FROM public.demo_excluded_emails WHERE email IN (${placeholders})`;
      const existing = await executeQuery<ExcludedEmail>(existingQuery, emailList);

      // Filter out duplicate emails
      const existingEmails = new Set(existing.map((e: ExcludedEmail) => e.email));
      const newEmails = emailList.filter((email: string) => !existingEmails.has(email));

      let results: ExcludedEmail[] = [];
      let duplicates: string[] = [];

      if (newEmails.length > 0) {
        // Insert only non-duplicate emails
        const values = newEmails.map((e: string) => `('${e.replace(/'/g, "''")}', '${reason.replace(/'/g, "''")}', true, NOW(), NOW())`).join(', ');
        const insertQuery = `
          INSERT INTO public.demo_excluded_emails (email, reason, is_active, created_at, updated_at)
          VALUES ${values}
          RETURNING email, reason, is_active, created_at, updated_at
        `;

        results = await executeQuery<ExcludedEmail>(insertQuery);
      }

      // Get list of duplicate emails
      duplicates = existing.map((e: ExcludedEmail) => e.email);

      return NextResponse.json({
        emails: results,
        duplicates: duplicates,
        inserted: results.length,
        skipped: duplicates.length,
        total_processed: emailList.length,
        message: `Added ${results.length} emails, skipped ${duplicates.length} duplicates`
      }, { status: results.length > 0 ? 201 : 200 });

    } else {
      // Handle single insert
      if (!email) {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existing = await executeQuerySingle<ExcludedEmail>(
        "SELECT email FROM public.demo_excluded_emails WHERE email = $1",
        [email]
      );

      if (existing) {
        return NextResponse.json(
          { error: "Email already exists in excluded list" },
          { status: 409 }
        );
      }

      const query = `
        INSERT INTO public.demo_excluded_emails (email, reason, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        RETURNING email, reason, is_active, created_at, updated_at
      `;

      const result = await executeQuerySingle<ExcludedEmail>(query, [email, reason]);

      return NextResponse.json({ email: result }, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating excluded email:", error);
    return NextResponse.json(
      { error: "Failed to create excluded email" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldEmail, email, reason, is_active } = body;

    if (!oldEmail || !email || !reason) {
      return NextResponse.json(
        { error: "Old email, new email and reason are required" },
        { status: 400 }
      );
    }

    // Check if new email exists with different old email
    if (oldEmail !== email) {
      const existing = await executeQuerySingle<ExcludedEmail>(
        "SELECT email FROM public.demo_excluded_emails WHERE email = $1",
        [email]
      );

      if (existing) {
        return NextResponse.json(
          { error: "Email already exists in excluded list" },
          { status: 409 }
        );
      }
    }

    const query = `
      UPDATE public.demo_excluded_emails
      SET email = $1, reason = $2, is_active = $3, updated_at = NOW()
      WHERE email = $4
      RETURNING email, reason, is_active, created_at, updated_at
    `;

    const result = await executeQuerySingle<ExcludedEmail>(query, [email, reason, is_active, oldEmail]);

    if (!result) {
      return NextResponse.json(
        { error: "Excluded email not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ email: result });
  } catch (error) {
    console.error("Error updating excluded email:", error);
    return NextResponse.json(
      { error: "Failed to update excluded email" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const query = "DELETE FROM public.demo_excluded_emails WHERE email = $1 RETURNING email";
    const result = await executeQuerySingle<{ email: string }>(query, [email]);

    if (!result) {
      return NextResponse.json(
        { error: "Excluded email not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedEmail: result.email });
  } catch (error) {
    console.error("Error deleting excluded email:", error);
    return NextResponse.json(
      { error: "Failed to delete excluded email" },
      { status: 500 }
    );
  }
}
