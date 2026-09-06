-- Run this once in Supabase SQL Editor for an existing project.
alter table public.materials
  add column if not exists is_public boolean not null default true;

drop policy if exists "Materials are public" on public.materials;
drop policy if exists "Public materials are visible" on public.materials;

create policy "Public materials are visible"
  on public.materials
  for select
  using (is_public = true or auth.uid() = uploader_id);

-- Refresh PostgREST's schema cache immediately.
notify pgrst, 'reload schema';
