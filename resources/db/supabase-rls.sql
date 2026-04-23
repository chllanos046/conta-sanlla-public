-- Conta Sanlla — Row Level Security
-- Run AFTER schema creation and data import
-- API routes use service_role key which bypasses RLS automatically.
-- RLS here denies all anon key access as a safety net.

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- No permissive policies = default DENY for anon key.
-- If direct Supabase Auth access is added in the future, add policies here.
