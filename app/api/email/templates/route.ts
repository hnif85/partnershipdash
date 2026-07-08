import { NextRequest, NextResponse } from "next/server";
import { ensureEmailSchema } from "@/lib/emailSchema";
import { executeQuery, executeQuerySingle } from "@/lib/database";

export async function GET(request: NextRequest) {
  await ensureEmailSchema();
  
  const id = request.nextUrl.searchParams.get("id");
  
  if (id) {
    const template = await executeQuerySingle<any>(
      "SELECT * FROM email_templates WHERE id = $1",
      [parseInt(id)]
    );
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ template });
  }
  
  const templates = await executeQuery<any>(
    "SELECT id, name, subject, variables, created_by, created_at, updated_at FROM email_templates ORDER BY updated_at DESC"
  );
  
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  try {
    await ensureEmailSchema();
    const body = await request.json();
    
    const name = String(body?.name || "").trim();
    const subject = String(body?.subject || "").trim();
    const htmlContent = String(body?.html_content || "").trim();
    
    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: "name, subject, and html_content are required" },
        { status: 400 }
      );
    }
    
    const plainText = String(body?.plain_text || "").trim() || null;
    const variables = body?.variables || autoDetectVariables(htmlContent);
    
    const created = await executeQuerySingle<any>(
      `INSERT INTO email_templates (name, subject, html_content, plain_text, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name) DO UPDATE SET
         subject = EXCLUDED.subject,
         html_content = EXCLUDED.html_content,
         plain_text = EXCLUDED.plain_text,
         variables = EXCLUDED.variables,
         updated_at = NOW()
       RETURNING *`,
      [name, subject, htmlContent, plainText, variables, body?.created_by || null]
    );
    
    return NextResponse.json({ template: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureEmailSchema();
    const id = parseInt(request.nextUrl.searchParams.get("id") || "");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    
    await executeQuery("DELETE FROM email_templates WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete template" },
      { status: 500 }
    );
  }
}

function autoDetectVariables(html: string): string[] {
  const regex = /\{\{\s*(\w+)\s*\}\}/g;
  const vars = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}
