# drive.

Drive-for-Student is a student-first study resource hub built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

## Getting started

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Enable Email and Google providers under Supabase Authentication.
5. Install and run:

```bash
npm install
npm run dev
```

The landing page is available at `/`, the authenticated product shell at `/dashboard`, and the material detail prototype at `/materials/demo`.

## Supabase notes

The SQL schema creates profiles, polymorphic materials, comments, bookmarks, votes, reports, RLS policies, and the public `materials` storage bucket. Production deployments should add a server-side upload rate limiter (for example, an Edge Function backed by a small counter table) before opening uploads to a large audience.
