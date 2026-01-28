import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/database";

type Customer = {
  guid: string;
  username?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  city?: string;
  country?: string;
  status?: string;
  is_active?: string;
  created_at?: string;
  updated_at?: string;
  totalAmount?: number;
  transactionCount?: number;
  lastTransactionAt?: string | null;
};

export async function GET() {
  try {
    // Fetch excluded emails from database
    const excludedEmails = await executeQuery<{ email: string }>(
      "SELECT email FROM public.demo_excluded_emails WHERE is_active = true"
    );
    const excludedEmailSet = new Set(excludedEmails.map(row => row.email.toLowerCase()));

    // Fetch customers from database with transaction data
    const customersData = await executeQuery<Customer & { total_amount?: number; transaction_count?: number; last_transaction_at?: string }>(`
      SELECT
        c.guid,
        c.username,
        c.full_name,
        c.email,
        c.phone_number,
        c.city,
        c.country,
        c.status,
        c.is_active,
        c.created_at,
        c.updated_at,
        COALESCE(t.total_amount, 0) as total_amount,
        COALESCE(t.transaction_count, 0) as transaction_count,
        t.last_transaction_at
      FROM cms_customers c
      LEFT JOIN (
        SELECT
          customer_guid,
          SUM(grand_total) as total_amount,
          COUNT(*) as transaction_count,
          MAX(created_at) as last_transaction_at
        FROM transactions
        WHERE status = 'PAID'
        GROUP BY customer_guid
      ) t ON t.customer_guid = c.guid
      ORDER BY c.created_at DESC
    `);

    // Filter out customers with excluded emails
    const filteredCustomers = customersData.filter(customer =>
      !customer.email || !excludedEmailSet.has(customer.email.toLowerCase())
    );

    // Transform to the expected format
    const customers = filteredCustomers.map(customer => ({
      user_id: customer.guid,
      name: customer.full_name || customer.username,
      email: customer.email,
      registeredAt: customer.created_at,
      id: customer.guid,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      totalAmount: customer.total_amount || 0,
      transactionCount: customer.transaction_count || 0,
      lastTransactionAt: customer.last_transaction_at,
    }));

    return NextResponse.json({ customers, meta: { total: customers.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
