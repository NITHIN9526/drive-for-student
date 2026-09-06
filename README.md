# drive.

Drive-for-Student is a student-first study resource hub built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

## Getting started

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. In Supabase **SQL Editor**, run the complete contents of `supabase/schema.sql` first. Then run the complete contents of `supabase/migrations/20250906_material_visibility.sql`, `supabase/migrations/20250906_material_storage_policies.sql`, and finally `supabase/migrations/20250906_upload_attachments.sql`. The last migration creates the `public.uploads` and `public.attachments` tables, backfills legacy materials, and enables multi-attachment uploads. If the app says `Could not find the table 'public.uploads' in the schema cache`, that last migration has not been run (or the SQL editor has not finished refreshing); run it, wait a few seconds, and reload the app.
4. Enable Email and Google providers under Supabase Authentication.
5. Install and run:

```bash
npm install
npm run dev
```

The landing page is available at `/`, the authenticated product shell at `/dashboard`, and public upload previews at `/material/[uploadId]`.

## Supabase notes

The SQL schema creates profiles, polymorphic materials, comments, bookmarks, votes, reports, RLS policies, and the public `materials` storage bucket. Production deployments should add a server-side upload rate limiter (for example, an Edge Function backed by a small counter table) before opening uploads to a large audience.
