# Supabase setup for Rafiq account sync

The app syncs one client-encrypted vault per account. The server stores an opaque envelope, a version and timestamps.
The schema and the two functions live in `migrations/0001_vaults.sql`. The migration has not been run against a real
project yet: apply it to a test project and run the SQL checks (another user cannot read or write a vault, a stale
`expected_version` is refused, the 5 MB cap is enforced) before relying on it.

## 1. Apply the migration

Either:

- Open the project's SQL editor, paste the contents of `migrations/0001_vaults.sql` and run it once; or
- With the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.

## 2. Auth settings (Authentication, Providers and Email)

- The Email provider is on.
- Sign-ups are allowed (the app signs new users up with `shouldCreateUser`).
- The "Magic Link" / "Confirm signup" email templates show the code: put `{{ .Token }}` in the body (the 6-digit
  code the app asks for). The app does not use the link.

## 3. Environment variables

Set both for the web build (for example Vercel environment variables) and for the Android build (build time):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL (Project settings, API) |
| `VITE_SUPABASE_ANON_KEY` | The public `anon` key |

For local work copy `.env.example` to `.env.local` (git-ignored). The anon key is public by design; row-level security
and the two functions are the protection. Never use the `service_role` key in the app. With either variable empty,
sync stays off.

## Before real users

- Supabase's built-in email sender is limited to a few emails per hour and is meant for testing. Configure a custom
  SMTP sender (for example Resend) on a domain you own before launch.
- Confirm the current free-tier rules, for example projects pausing after a period of inactivity.
