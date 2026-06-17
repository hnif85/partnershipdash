import "dotenv/config";
import { pool } from "./lib/database";

async function excludeTestEmails() {
  console.log("Scanning for test emails ending with @email.com...");

  const client = await pool.connect();
  try {
    // Find distinct emails from cms_customers ending with @email.com
    const customerResult = await client.query(`
      SELECT DISTINCT email FROM cms_customers
      WHERE email ILIKE '%@email.com'
        AND email NOT IN (SELECT email FROM demo_excluded_emails)
      ORDER BY email
    `);

    const emails = customerResult.rows.map(r => r.email as string);
    console.log(`Found ${emails.length} unique @email.com emails in cms_customers not yet excluded.`);

    if (emails.length === 0) {
      console.log("Nothing to do.");
      return;
    }

    // Bulk insert into demo_excluded_emails
    let inserted = 0;
    for (const email of emails) {
      try {
        const result = await client.query(`
          INSERT INTO public.demo_excluded_emails (email, reason, is_active, created_at, updated_at)
          VALUES ($1, $2, true, NOW(), NOW())
          ON CONFLICT (email) DO NOTHING
          RETURNING email
        `, [email, "Test email (@email.com)"]);
        if (result.rows.length > 0) inserted++;
      } catch (err: any) {
        // Skip if constraint doesn't exist — try without ON CONFLICT
        if (err.code === "42P10" || err.message?.includes("no unique or exclusion constraint")) {
          const result = await client.query(`
            INSERT INTO public.demo_excluded_emails (email, reason, is_active, created_at, updated_at)
            VALUES ($1, $2, true, NOW(), NOW())
            RETURNING email
          `, [email, "Test email (@email.com)"]);
          if (result.rows.length > 0) inserted++;
        } else {
          throw err;
        }
      }
    }

    console.log(`Inserted ${inserted} of ${emails.length} emails into demo_excluded_emails.`);
  } finally {
    client.release();
  }

  await pool.end();
}

excludeTestEmails().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
