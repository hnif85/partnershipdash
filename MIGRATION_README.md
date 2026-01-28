# Supabase Migration Guide

This guide will help you migrate your partnership dashboard from local PostgreSQL to Supabase.

## Prerequisites

1. **Supabase Project**: Create a new project at [supabase.com](https://supabase.com)
2. **Python 3.8+**: Make sure Python is installed on your system
3. **Service Role Key**: Get your service role key from Supabase Dashboard → Settings → API

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements_migration.txt
```

### 2. Configure Environment Variables

Update your `.env.local` file with the correct Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: Replace `your_service_role_key_here` with your actual service role key from Supabase.

### 3. Get Your Service Role Key

1. Go to your Supabase Dashboard
2. Navigate to Settings → API
3. Copy the "service_role" key (it's the secret one)
4. Paste it into your `.env.local` file

## Running the Migration

### Option 1: Run the Python Script
```bash
python migrate_to_supabase.py
```

### Option 2: Manual SQL Execution
If you prefer to run the SQL manually:

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase_migration.sql`
3. Paste and execute the SQL

## What the Script Does

1. **Connection Test**: Verifies your Supabase connection
2. **Schema Creation**: Creates all necessary tables:
   - `cms_customers` - Customer data
   - `transactions` - Transaction records
   - `transaction_details` - Transaction line items
   - `leads` - Lead information
   - `training_events` - Training event data
   - `products` - Product catalog
   - And 15+ other supporting tables

3. **Index Creation**: Adds performance indexes
4. **Constraint Setup**: Creates foreign key relationships
5. **Verification**: Checks that all tables were created successfully

## Expected Output

```
🚀 Supabase Migration Script
==================================================
📍 Supabase URL: https://udupiblnzlzjmaafvdtv.supabase.co
🔗 Database URL created (hidden for security)
🔍 Testing database connection...
✅ Database connection successful!
📄 Migration SQL loaded (XXXX characters)
🚀 Starting database migration...
✅ Executed statement 1/XX
✅ Executed statement 2/XX
...
✅ Migration completed successfully!
🔍 Verifying table creation...
✅ Table 'cms_customers': exists
✅ Table 'transactions': exists
✅ Table 'transaction_details': exists
✅ Table 'leads': exists
✅ Table 'training_events': exists
✅ Table 'products': exists

🎉 Migration completed successfully!

Next steps:
1. Update your application code to use Supabase
2. Test your API endpoints
3. Migrate your existing data if needed
```

## Troubleshooting

### Connection Issues
- **"Database connection failed"**: Check your service role key and Supabase URL
- **"Missing Supabase URL or service role key"**: Make sure both are set in `.env.local`

### Permission Issues
- Make sure you're using the **service role key**, not the anon key
- The service role key has full database access

### Table Creation Errors
- Some tables might already exist - the script uses `IF NOT EXISTS` to handle this
- Check Supabase logs for detailed error messages

## Next Steps After Migration

1. **Update Application Code**:
   - Replace local PostgreSQL connection with Supabase client
   - Update database queries to use Supabase syntax

2. **Test API Endpoints**:
   - Verify all your API routes work with Supabase
   - Check data retrieval and insertion

3. **Data Migration** (if needed):
   - Export data from your local database
   - Import data into Supabase tables

4. **Enable Row Level Security (RLS)**:
   - Configure RLS policies in Supabase for data security
   - Test with different user roles

## File Structure

```
.
├── .env.local                    # Environment variables
├── supabase_migration.sql       # Database schema SQL
├── migrate_to_supabase.py       # Migration script
├── requirements_migration.txt   # Python dependencies
└── MIGRATION_README.md          # This file
```

## Support

If you encounter issues:
1. Check the error messages in the console
2. Verify your Supabase credentials
3. Make sure your Supabase project is active
4. Check Supabase status page for any outages
