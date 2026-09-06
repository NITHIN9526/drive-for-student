-- Run this once if PDF uploads return a Storage RLS error.
drop policy if exists "Users upload materials" on storage.objects;
create policy "Users upload materials"
on storage.objects for insert to authenticated
with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users manage own material files" on storage.objects;
create policy "Users manage own material files"
on storage.objects for all to authenticated
using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
