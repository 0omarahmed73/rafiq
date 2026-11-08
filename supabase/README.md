# Supabase setup for Rafiq account sync

The app syncs one client-encrypted vault per account. The server stores an opaque envelope, a version and timestamps.
The schema and the two functions live in `migrations/0001_vaults.sql`; `migrations/0002_hardening.sql` replaces
`push_vault` so it raises `vault disappeared` instead of returning `(true, NULL)` in a rare race.

Live state (recorded by another worker, not verified by the code review; see `HANDOFF.md`, "Encrypted account sync"):
a Supabase project exists and `0001` was applied to it from the SQL Editor. `0002_hardening.sql` must still be applied
to that live project; nothing records it being applied, and it has not been verified there. None of the checks below
has been run against a real project yet.

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
- The Site URL is the production URL, not `http://localhost:3000`: a template that still sends a link would otherwise
  put a session in the address bar of a localhost page.

## 3. Environment variables

Set both for the web build (for example Vercel environment variables) and for the Android build (build time):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL (Project settings, API) |
| `VITE_SUPABASE_ANON_KEY` | The public `anon` key or the public publishable key (`sb_publishable_...`) |

For local work copy `.env.example` to `.env.local` (git-ignored). The anon key is public by design; row-level security
and the two functions are the protection. Never use the `service_role` or secret key in the app. With either
variable empty, sync stays off.

## 4. Live SQL verification checklist

Run these against the live project after `0002` is applied, and record the results in `HANDOFF.md`. In the SQL
editor (which runs as `postgres`, so `auth.uid()` is null) act as a user inside one transaction:
`begin; set local role authenticated; set local request.jwt.claims = '{"sub":"<user-uuid>","role":"authenticated"}';`
then the calls, then `rollback;`. Checks through the REST API use the anon key plus a signed-in user's token.

1. Grants and function settings: on `public.vaults`, `authenticated` has `SELECT` only and `anon` / `public` have
   nothing (`information_schema.role_table_grants`). In `pg_proc`, `push_vault` and `reset_vault` have
   `prosecdef = true` (security definer), `proconfig` contains `search_path=public`, and `proacl` grants `EXECUTE`
   to `authenticated` only. The `push_vault` body contains `vault disappeared` (proves `0002` is applied).
2. Row-level security: `pg_class.relrowsecurity` is true for `vaults`, and `pg_policies` has exactly one policy, the
   `SELECT` policy "owner can read" with `auth.uid() = user_id`; no insert, update or delete policy.
3. No client writes: as a signed-in user, a direct REST `insert`, `update` or `delete` on `vaults` is refused.
4. Compare-and-swap as user A: `push_vault(0, e1)` gives `(true, 1)`; `push_vault(0, e1)` again gives `(false, 1)`;
   `push_vault(1, e2)` gives `(true, 2)` and the row now has `prev_version = 1` and `prev_envelope = e1`;
   `push_vault(1, e3)` gives `(false, 2)`. On a fresh account two parallel `push_vault(0, ...)` calls give one
   `(true, 1)` and one `(false, 1)`, never `(true, NULL)`.
5. `reset_vault` atomic replace: on an account with no row it returns 1; on a row at version n it returns n + 1, the
   old envelope becomes `prev_envelope`, and the body is one `insert ... on conflict do update` statement.
6. 5 MB cap: an envelope over 5,242,880 bytes (as text) is refused by both functions with the message
   `vault too large`; the app shows it as "too large".
7. Unauthenticated denied: with only the anon key and no session, selecting `vaults` and calling either function
   through REST fail with permission denied; in SQL with `auth.uid()` null, both functions raise `not authenticated`.
8. Other user denied: as user B, selecting `vaults` returns no row of user A, and B's `push_vault` / `reset_vault`
   calls change only B's row (A's version and envelope are unchanged).
9. REST shapes and advisors: through supabase-js, `rpc('push_vault')` returns `[{ ok, version }]` and
   `rpc('reset_vault')` a bare number (the app accepts a version as a number or numeric string). The dashboard
   Security Advisor shows no warning for `vaults` or the two functions (for example "function search path mutable").

The `vault disappeared` branch in `push_vault` cannot be triggered from the client (the row would have to vanish
between two statements of one call); check it by reading the body (item 1).

## Before real users

- Supabase's built-in email sender is limited to a few emails per hour and is meant for testing. A custom SMTP sender
  on a domain you own (for example Resend with that domain) is REQUIRED before launch. A personal Gmail SMTP account
  does not meet this: it has Gmail's own sending limits and Supabase warns about its deliverability.
- Open sign-ups plus up to 5 MB (about 10 MB with the previous copy) per account is a storage-abuse risk on the free
  tier's 500 MB database. Watch usage, and consider limiting sign-ups or adding quotas.
- Confirm the current free-tier rules, for example projects pausing after a period of inactivity.
- `session()` may refresh an expired access token, so it can hit the network and fail with a network error.
