create type material_type as enum ('pdf', 'youtube', 'note');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null default '',
  full_name text not null default '',
  college text not null default '',
  branch text not null default '',
  semester int check (semester between 1 and 12),
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  type material_type not null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  subject text not null default '',
  branch text not null default '',
  semester int check (semester between 1 and 12),
  file_path text,
  external_url text,
  content text,
  thumbnail_url text,
  is_public boolean not null default true,
  views int not null default 0,
  downloads int not null default 0,
  created_at timestamptz not null default now()
);
create table public.comments (id uuid primary key default gen_random_uuid(), material_id uuid not null references public.materials(id) on delete cascade, author_id uuid not null references public.profiles(id) on delete cascade, body text not null check (char_length(body) between 1 and 1000), created_at timestamptz not null default now());
create table public.bookmarks (user_id uuid references public.profiles(id) on delete cascade, material_id uuid references public.materials(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, material_id));
create table public.votes (user_id uuid references public.profiles(id) on delete cascade, material_id uuid references public.materials(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, material_id));
create table public.reports (id uuid primary key default gen_random_uuid(), material_id uuid not null references public.materials(id) on delete cascade, reporter_id uuid not null references public.profiles(id) on delete cascade, reason text not null, status text not null default 'open', created_at timestamptz not null default now());
alter table public.profiles enable row level security; alter table public.materials enable row level security; alter table public.comments enable row level security; alter table public.bookmarks enable row level security; alter table public.votes enable row level security; alter table public.reports enable row level security;
create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users edit own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Public materials are visible" on public.materials for select using (is_public = true or auth.uid() = uploader_id);
create policy "Users create materials" on public.materials for insert with check (auth.uid() = uploader_id);
create policy "Users edit own materials" on public.materials for update using (auth.uid() = uploader_id);
create policy "Users delete own materials" on public.materials for delete using (auth.uid() = uploader_id);
create policy "Comments are public" on public.comments for select using (true);
create policy "Users create comments" on public.comments for insert with check (auth.uid() = author_id);
create policy "Users manage bookmarks" on public.bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage votes" on public.votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users create reports" on public.reports for insert with check (auth.uid() = reporter_id);
insert into storage.buckets (id, name, public) values ('materials', 'materials', true) on conflict do nothing;
drop policy if exists "Users upload materials" on storage.objects;
create policy "Users upload materials" on storage.objects for insert to authenticated with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users manage own material files" on storage.objects;
create policy "Users manage own material files" on storage.objects for all to authenticated using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

-- Keep profiles in sync with every auth provider, including Google.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'student'), '[^a-zA-Z0-9_]+', '', 'g'));
  if base_username = '' then base_username := 'student'; end if;
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    left(base_username, 36) || '_' || right(replace(new.id::text, '-', ''), 6),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Student'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Migration for projects that ran the first version of this schema.
alter table public.profiles add column if not exists username text;
update public.profiles
set username = 'student_' || right(replace(id::text, '-', ''), 6)
where username is null or username = '';
alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_key on public.profiles (username);
alter table public.materials add column if not exists is_public boolean not null default true;
