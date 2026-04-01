create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  topic text not null,
  created_by text not null,
  started boolean default false,
  transcript text,
  created_at timestamptz default now()
);
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  room_code text references rooms(code) on delete cascade,
  name text not null,
  personality text not null,
  color_index int default 0,
  is_creator boolean default false,
  vote boolean,
  joined_at timestamptz default now(),
  unique(room_code, name)
);
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table members;
alter table rooms enable row level security;
alter table members enable row level security;
create policy "Public read rooms" on rooms for select using (true);
create policy "Public insert rooms" on rooms for insert with check (true);
create policy "Public update rooms" on rooms for update using (true);
create policy "Public read members" on members for select using (true);
create policy "Public insert members" on members for insert with check (true);
create policy "Public update members" on members for update using (true);
create policy "Public delete members" on members for delete using (true);