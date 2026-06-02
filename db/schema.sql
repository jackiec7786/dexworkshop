-- Run in Neon SQL Editor: Dashboard → SQL Editor → New query → Run

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

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_touch ON jobs;
CREATE TRIGGER jobs_touch BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

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
