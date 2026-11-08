# Supabase setup for Rafiq account sync

The app syncs one client-encrypted vault per account. The server stores an opaque envelope, a version and timestamps.
The schema and the two functions live in `migrations/0001_vaults.sql`. The migration has not been run against a real
project yet: apply it to a test project and run the SQL checks (another user cannot read or write a vault, a stale
`expected_version` is refused, the 5 MB cap is enforced) before relying on it.

## 1. Apply the migrations

Apply `migrations/0001_vaults.sql` and then `migrations/0002_hardening.sql`, in that order, with ONE method only:

- Open the project's SQL editor, paste each file's contents in order and run it once; or
- With the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.

Do not mix the two methods: `0001` is not idempotent (it uses plain `create table` / `create function`), so a second
run fails. `0002` only replaces `push_vault` and is safe to repeat. A project that already ran `0001` needs `0002`.
Neither file was executed by the review process: the SQL was only read, never run, so test it on a project first.

## 2. Auth settings (Authentication, Providers and Email)

- The Email provider is on.
- Keep "Allow anonymous sign-ins" OFF. Anonymous users get the `authenticated` role, so each could store a vault
  (up to about 10 MB including the previous copy).
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

- Open sign-ups plus up to 5 MB (about 10 MB with the previous copy) per account is a storage-abuse risk on the free
  tier's 500 MB database. Watch usage, and consider limiting sign-ups or adding quotas.
- `session()` may refresh an expired access token, so it can hit the network and fail with a network error.

- Supabase's built-in email sender is limited to a few emails per hour and is meant for testing. Configure a custom
  SMTP sender (for example Resend) on a domain you own before launch.
- Confirm the current free-tier rules, for example projects pausing after a period of inactivity.
