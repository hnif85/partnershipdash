-- Create transactions table
CREATE TABLE transactions (
  guid TEXT PRIMARY KEY,
  invoice_number TEXT,
  customer_guid TEXT,
  transaction_callback_id TEXT,
  status TEXT,
  payment_channel_id TEXT,
  payment_channel_code TEXT,
  payment_channel_name TEXT,
  payment_url TEXT,
  qty INTEGER,
  valuta_code TEXT,
  sub_total NUMERIC,
  platform_fee NUMERIC,
  payment_service_fee NUMERIC,
  total_discount NUMERIC,
  grand_total NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by_guid TEXT,
  created_by_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by_guid TEXT,
  updated_by_name TEXT,

  -- Foreign key to cms_customers
  CONSTRAINT fk_transaction_customer
    FOREIGN KEY (customer_guid)
    REFERENCES cms_customers(guid)
);

-- Create transaction_details table
CREATE TABLE transaction_details (
  guid TEXT PRIMARY KEY,
  transaction_guid TEXT,
  merchant_guid TEXT,
  merchant_store_name TEXT,
  product_name TEXT,
  product_price NUMERIC,
  purchase_type_id TEXT,
  purchase_type_name TEXT,
  purchase_type_value TEXT,
  qty INTEGER,
  total_discount NUMERIC,
  grand_total NUMERIC,

  -- Foreign key to transactions
  CONSTRAINT fk_transaction_detail_transaction
    FOREIGN KEY (transaction_guid)
    REFERENCES transactions(guid)
);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_customer_guid ON transactions(customer_guid);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_invoice_number ON transactions(invoice_number);
CREATE INDEX idx_transaction_detail_transaction_guid ON transaction_details(transaction_guid);
