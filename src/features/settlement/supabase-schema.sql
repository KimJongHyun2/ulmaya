-- Supabase bootstrap schema for storing settlement sessions as JSON.
-- Run this SQL in the Supabase SQL editor before wiring repository.ts to the database.

create table if not exists settlement_sessions (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_settlement_sessions_updated_at on settlement_sessions;

create trigger update_settlement_sessions_updated_at
before update on settlement_sessions
for each row
execute function update_updated_at_column();
