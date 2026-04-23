-- Conta Sanlla — Supabase / Postgres schema
-- Run in Supabase SQL editor before importing data

-- Enum types
CREATE TYPE account_type     AS ENUM ('bank', 'cash', 'investment', 'credit');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE category_type    AS ENUM ('income', 'expense');

-- users
CREATE TABLE users (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT,                         -- NULL for OAuth users
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- accounts
CREATE TABLE accounts (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  type            account_type NOT NULL,
  initial_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  image_path      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- categories
CREATE TABLE categories (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  type       category_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- transactions
-- date stored as DATE (no time) to avoid UTC/timezone issues
CREATE TABLE transactions (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type              transaction_type NOT NULL,
  amount            NUMERIC(15,2) NOT NULL,
  source_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  target_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  category_id       BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  date              DATE NOT NULL,
  description       TEXT,
  exchange_rate     NUMERIC(15,6),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
