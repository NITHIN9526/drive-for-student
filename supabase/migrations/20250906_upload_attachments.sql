-- Prerequisite: run supabase/schema.sql first, then the visibility and storage
-- migrations. Uploads are the shareable parent resource. Attachments let one resource
-- contain several PDFs, links, and notes without breaking the legacy materials table.
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  subject text not null default '',
  branch text not null default '',
  semester int check (semester between 1 and 12),
  is_public boolean not null default true,
  shares_count int not null default 0 check (shares_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  kind text not null check (kind in ('pdf', 'youtube', 'note')),
  file_path text,
  external_url text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (
    (kind = 'pdf' and file_path is not null and external_url is null and content is null)
    or (kind = 'youtube' and external_url is not null and file_path is null and content is null)
    or (kind = 'note' and content is not null and file_path is null and external_url is null)
  )
);

alter table public.materials add column if not exists upload_id uuid references public.uploads(id) on delete set null;
alter table public.materials add column if not exists shares_count int not null default 0;

-- Backfill existing materials into the new shape using the same IDs. This makes
-- old links continue to work while new clients can use uploads/[attachments].
insert into public.uploads (id, uploader_id, title, description, subject, branch, semester, is_public, created_at)
select id, uploader_id, title, description, subject, branch, semester, is_public, created_at
from public.materials
on conflict (id) do nothing;

insert into public.attachments (upload_id, kind, file_path, external_url, content, metadata)
select
  id,
  type::text,
  file_path,
  external_url,
  content,
  jsonb_build_object('thumbnail_url', coalesce(thumbnail_url, ''))
from public.materials
where not exists (select 1 from public.attachments a where a.upload_id = materials.id);

update public.materials set upload_id = id where upload_id is null;

alter table public.uploads enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "Public uploads are visible" on public.uploads;
create policy "Public uploads are visible" on public.uploads
  for select using (is_public = true or auth.uid() = uploader_id);
drop policy if exists "Users create uploads" on public.uploads;
create policy "Users create uploads" on public.uploads
  for insert to authenticated with check (auth.uid() = uploader_id);
drop policy if exists "Users edit own uploads" on public.uploads;
create policy "Users edit own uploads" on public.uploads
  for update to authenticated using (auth.uid() = uploader_id) with check (auth.uid() = uploader_id);
drop policy if exists "Users delete own uploads" on public.uploads;
create policy "Users delete own uploads" on public.uploads
  for delete to authenticated using (auth.uid() = uploader_id);

drop policy if exists "Public upload attachments are visible" on public.attachments;
create policy "Public upload attachments are visible" on public.attachments
  for select using (
    exists (
      select 1 from public.uploads
      where uploads.id = attachments.upload_id
        and (uploads.is_public = true or uploads.uploader_id = auth.uid())
    )
  );
drop policy if exists "Users create upload attachments" on public.attachments;
create policy "Users create upload attachments" on public.attachments
  for insert to authenticated with check (
    exists (select 1 from public.uploads where uploads.id = attachments.upload_id and uploads.uploader_id = auth.uid())
  );
drop policy if exists "Users edit upload attachments" on public.attachments;
create policy "Users edit upload attachments" on public.attachments
  for update to authenticated
  using (
    exists (select 1 from public.uploads where uploads.id = attachments.upload_id and uploads.uploader_id = auth.uid())
  )
  with check (
    exists (select 1 from public.uploads where uploads.id = attachments.upload_id and uploads.uploader_id = auth.uid())
  );
drop policy if exists "Users delete upload attachments" on public.attachments;
create policy "Users delete upload attachments" on public.attachments
  for delete to authenticated using (
    exists (select 1 from public.uploads where uploads.id = attachments.upload_id and uploads.uploader_id = auth.uid())
  );

-- Sharing is intentionally allowed without a login so public links can record
-- shares. The function only updates a public counter and returns its new value.
create or replace function public.increment_upload_shares(target_upload_id uuid)
returns int
language sql
security definer
set search_path = public
as $$
  update public.uploads
  set shares_count = shares_count + 1
  where id = target_upload_id and is_public = true
  returning shares_count;
$$;

revoke all on function public.increment_upload_shares(uuid) from public;
grant execute on function public.increment_upload_shares(uuid) to anon, authenticated;

create index if not exists attachments_upload_id_idx on public.attachments(upload_id);
create index if not exists uploads_uploader_id_idx on public.uploads(uploader_id);
notify pgrst, 'reload schema';
