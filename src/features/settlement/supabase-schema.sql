-- Supabase bootstrap schema for ulmaya settlement storage.
-- Run this whole file in the Supabase SQL Editor.
-- settlement_sessions is intentionally preserved because the app still uses it
-- for client flow recovery. ERD tables are dropped/recreated below.

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

alter table settlement_sessions disable row level security;

-- ERD tables: drop in reverse dependency order.
drop table if exists settlement_results;
drop table if exists settlement_requests;
drop table if exists menu_items;
drop table if exists receipts;
drop table if exists participants;
drop table if exists stores;
drop table if exists users;

-- ERD tables: create parent tables first.
create table users (
  user_id text primary key,
  kakao_id text unique,
  nickname text,
  profile_image text,
  joined_at timestamptz default now()
);

create table stores (
  store_id text primary key,
  store_name text not null,
  address text,
  phone text
);

create table participants (
  participant_id bigint primary key,
  name text not null,
  contact text,
  kakao_linked boolean not null default false,
  profile_image text
);

create table receipts (
  receipt_id text primary key,
  image_path text,
  ocr_raw_text text,
  total_amount integer not null default 0,
  registered_at timestamptz default now(),
  store_id text references stores (store_id),
  user_id text references users (user_id)
);

-- Weak entity: menu_item_id is only unique within a receipt.
create table menu_items (
  menu_item_id bigint not null,
  receipt_id text not null references receipts (receipt_id) on delete cascade,
  menu_name text not null,
  unit_price integer not null default 0,
  quantity integer not null default 1,
  amount integer not null default 0,
  edited boolean not null default false,
  primary key (menu_item_id, receipt_id)
);

create table settlement_requests (
  settlement_request_id text primary key,
  menu_item_id bigint not null,
  receipt_id text not null,
  participant_id bigint not null references participants (participant_id),
  requested_amount integer not null default 0,
  request_method text not null default 'KAKAO_PAY',
  request_status text not null default 'PENDING',
  requested_at timestamptz default now(),
  request_message text,
  foreign key (menu_item_id, receipt_id)
    references menu_items (menu_item_id, receipt_id)
    on delete cascade
);

create table settlement_results (
  settlement_result_id text primary key,
  menu_item_id bigint not null,
  receipt_id text not null,
  participant_id bigint not null references participants (participant_id),
  settlement_amount integer not null default 0,
  invite_status text not null default 'PENDING',
  transfer_status text not null default 'PENDING',
  completed boolean not null default false,
  completed_at timestamptz,
  foreign key (menu_item_id, receipt_id)
    references menu_items (menu_item_id, receipt_id)
    on delete cascade
);

-- Development/demo mode: allow browser Supabase client access.
-- Re-enable RLS and replace this with authenticated policies before production.
alter table users disable row level security;
alter table stores disable row level security;
alter table participants disable row level security;
alter table receipts disable row level security;
alter table menu_items disable row level security;
alter table settlement_requests disable row level security;
alter table settlement_results disable row level security;
