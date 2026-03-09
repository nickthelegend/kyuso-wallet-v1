create table wallets (
  id uuid primary key default uuid_generate_v4(),
  supabase_user_id uuid unique not null references auth.users(id),
  algo_address text not null,
  created_at timestamp with time zone default now()
);
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  tx_id text unique, -- The Algorand Transaction Hash
  amount bigint,
  receiver text,
  status text default 'pending', -- 'pending', 'confirmed', 'failed'
  created_at timestamp with time zone default now()
);
create table user_settings (
  user_id uuid primary key references auth.users(id),
  display_currency text default 'USD',
  notifications_enabled boolean default true
);
