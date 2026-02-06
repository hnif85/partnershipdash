import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const customerGuid = searchParams.get('customer_guid') || '';
    const paymentChannel = searchParams.get('payment_channel') || '';
    const currency = searchParams.get('currency') || '';
    const referral = searchParams.get('referral') || '';

    const offset = (page - 1) * limit;

    // Check if this is a request for last transaction date
    if (searchParams.get('get_last_date') === 'true') {
      const lastDateQuery = `
        SELECT MAX(created_at) as last_date
        FROM transactions
        WHERE created_at IS NOT NULL
      `;
      const lastDateResult = await pool.query(lastDateQuery);
      const lastDate = lastDateResult.rows[0]?.last_date;

      return NextResponse.json({
        last_transaction_date: lastDate ? new Date(lastDate).toISOString().split('T')[0] : null
      });
    }

    // Build WHERE conditions
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Always exclude demo emails
    whereConditions.push(`dee.email IS NULL`);

    if (search) {
      whereConditions.push(`(
        t.invoice_number ILIKE $${paramIndex} OR
        c.full_name ILIKE $${paramIndex + 1} OR
        c.email ILIKE $${paramIndex + 2} OR
        c.username ILIKE $${paramIndex + 3}
      )`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 4;
    }

    if (status) {
      whereConditions.push(`LOWER(t.status) = LOWER($${paramIndex})`);
      params.push(status);
      paramIndex += 1;
    }

    if (startDate) {
      whereConditions.push(`t.created_at >= $${paramIndex}::timestamp`);
      params.push(startDate);
      paramIndex += 1;
    }

    if (endDate) {
      whereConditions.push(`t.created_at <= $${paramIndex}::timestamp`);
      params.push(endDate);
      paramIndex += 1;
    }

    if (customerGuid) {
      whereConditions.push(`t.customer_guid = $${paramIndex}`);
      params.push(customerGuid);
      paramIndex += 1;
    }

    if (paymentChannel) {
      whereConditions.push(`t.payment_channel_name = $${paramIndex}`);
      params.push(paymentChannel);
      paramIndex += 1;
    }

    if (currency) {
      whereConditions.push(`UPPER(t.valuta_code) = UPPER($${paramIndex})`);
      params.push(currency);
      paramIndex += 1;
    }

    if (referral) {
      whereConditions.push(`rp.partner ILIKE $${paramIndex}`);
      params.push(`%${referral}%`);
      paramIndex += 1;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query to get transactions with customer info (excluding demo emails)
    const query = `
      SELECT
        t.guid,
        t.invoice_number,
        t.customer_guid,
        c.full_name as customer_full_name,
        c.username as customer_username,
        c.email as customer_email,
        t.transaction_callback_id,
        t.status,
        t.payment_channel_id,
        t.payment_channel_code,
        t.payment_channel_name,
        t.payment_url,
        t.qty,
        t.valuta_code,
        t.sub_total,
        t.platform_fee,
        t.payment_service_fee,
        t.total_discount,
        t.grand_total,
        t.created_at,
        t.created_by_guid,
        t.created_by_name,
        rp.partner as referral_name,
        COALESCE(
          json_agg(
            json_build_object(
              'guid', td.guid,
              'transaction_guid', td.transaction_guid,
              'merchant_guid', td.merchant_guid,
              'merchant_store_name', td.merchant_store_name,
              'product_name', td.product_name,
              'product_price', td.product_price,
              'purchase_type_id', td.purchase_type_id,
              'purchase_type_name', td.purchase_type_name,
              'purchase_type_value', td.purchase_type_value,
              'qty', td.qty,
              'total_discount', td.total_discount,
              'grand_total', td.grand_total
            )
          ) FILTER (WHERE td.guid IS NOT NULL),
          '[]'::json
        ) as transaction_details
      FROM transactions t
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      LEFT JOIN referral_partners rp ON c.referal_code = rp.code
      LEFT JOIN transaction_details td ON t.guid = td.transaction_guid
      ${whereClause}
      GROUP BY t.guid, c.guid, c.full_name, c.username, c.email, rp.partner
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Query to get total count (excluding demo emails)
    const countQuery = `
      SELECT 
        COUNT(DISTINCT t.guid) as total_count,
        COUNT(DISTINCT t.customer_guid) as unique_customer_count
      FROM transactions t
      LEFT JOIN cms_customers c ON t.customer_guid = c.guid
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      LEFT JOIN referral_partners rp ON c.referal_code = rp.code
      ${whereClause}
    `;



    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
    ]);

    const transactions = result.rows.map(row => ({
      ...row,
      transaction_details: Array.isArray(row.transaction_details) ? row.transaction_details : []
    }));

    const totalCount = parseInt(countResult.rows[0].total_count);
    const uniqueCustomerCount = parseInt(countResult.rows[0].unique_customer_count || '0');

    return NextResponse.json({
      transactions,
      total_count: totalCount,
      unique_customer_count: uniqueCustomerCount,
      page,
      limit,
      total_pages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Transactions API error:", error);
    return NextResponse.json({
      error: message,
      transactions: [],
      total_count: 0
    }, { status: 500 });
  }
}
