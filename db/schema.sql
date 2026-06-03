-- DEX Workshop — database schema
-- Run once in the Neon SQL Editor: Dashboard → SQL Editor → New query → Run.

-- ---------------------------------------------------------------------------
-- Auth: a single shop owner account (created via the first-run setup screen).
-- Passwords are bcrypt hashes — never stored in plaintext.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Jobs: one row carries a customer + vehicle through inspection → quote → invoice.
-- JSONB keeps the whole job in a single read/write. `owner` is the shop key.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'Quote' CHECK (status IN ('Quote','Invoice','Paid')),
  customer     JSONB NOT NULL DEFAULT '{}',
  vehicle      JSONB NOT NULL DEFAULT '{}',
  marks        JSONB NOT NULL DEFAULT '[]',
  line_items   JSONB NOT NULL DEFAULT '[]',
  notes        TEXT DEFAULT '',
  discount     NUMERIC NOT NULL DEFAULT 0,
  tax_rate     NUMERIC NOT NULL DEFAULT 0,
  deposit      NUMERIC NOT NULL DEFAULT 0,
  photos       JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS jobs_owner_idx ON jobs(owner, created_at DESC);

-- Phase 2: booking date for the shop calendar.
-- Run this if upgrading from an earlier schema version:
-- ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_date DATE;
-- CREATE INDEX IF NOT EXISTS jobs_scheduled_idx ON jobs(owner, scheduled_date);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_touch ON jobs;
CREATE TRIGGER jobs_touch BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory: stock items for the shop (film rolls, chemicals, consumables…).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner      TEXT NOT NULL DEFAULT 'shop',
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Other',
  unit       TEXT NOT NULL DEFAULT 'pcs',
  stock      NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_at NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier   TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS inventory_owner_idx ON inventory(owner, category, name);

-- ---------------------------------------------------------------------------
-- Customers: augmentation store for notes & tags; join to jobs via phone.
-- Phone is stored as digits-only (e.g. "923214432687"). A partial unique
-- index prevents duplicate records for the same phone, while still allowing
-- rows with no phone on file.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner      TEXT NOT NULL DEFAULT 'shop',
  phone      TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  tags       JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_owner_phone_idx
  ON customers(owner, phone) WHERE phone != '';

-- ---------------------------------------------------------------------------
-- Expenses: every shop expense logged against the ledger. One row per expense.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner      TEXT NOT NULL DEFAULT 'shop',
  date       DATE NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Other',
  supplier   TEXT NOT NULL DEFAULT '',
  amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst        NUMERIC(12,2) NOT NULL DEFAULT 0,
  note       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS expenses_owner_idx ON expenses(owner, date DESC);

-- ---------------------------------------------------------------------------
-- Settings: business identity shown on printed quotes/invoices. One row per shop.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  owner      TEXT PRIMARY KEY,
  biz_name   TEXT DEFAULT 'My Workshop',
  tagline    TEXT DEFAULT 'Dent · Coating · Wraps',
  phone      TEXT DEFAULT '',
  email      TEXT DEFAULT '',
  address    TEXT DEFAULT '',
  currency   TEXT DEFAULT 'Rs',
  tax_rate   NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
