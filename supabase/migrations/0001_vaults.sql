-- Rafiq encrypted account sync: one opaque, client-encrypted vault per account.
-- The server only ever sees the email, the version, timestamps and the size of the blob.

create table public.vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null,
  envelope jsonb not null,
  prev_version bigint,
  prev_envelope jsonb,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

create policy "owner can read" on public.vaults for select using (auth.uid() = user_id);
-- No insert/update/delete policies: every write goes through the functions below.
revoke all on table public.vaults from public, anon, authenticated;
grant select on table public.vaults to authenticated;

-- Compare-and-swap push. Returns (true, new version) when accepted, (false, current version) when stale.
-- A missing row accepts only expected_version = 0 (inserts version 1). Envelopes over 5 MB (as text) are refused.
create function public.push_vault(expected_version bigint, new_envelope jsonb)
returns table(ok boolean, version bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_version bigint;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if expected_version is null then
    raise exception 'invalid expected version' using errcode = '22023';
  end if;
  if octet_length(new_envelope::text) > 5242880 then
    raise exception 'vault too large';
  end if;

  select v.version into current_version from public.vaults v where v.user_id = uid for update;

  if not found then
    if expected_version <> 0 then
      return query select false, 0::bigint;
      return;
    end if;
    insert into public.vaults (user_id, version, envelope) values (uid, 1, new_envelope)
      on conflict (user_id) do nothing;
    if found then
      return query select true, 1::bigint;
      return;
    end if;
    -- Another call of this account inserted the row first: fall through and compare against it.
    select v.version into current_version from public.vaults v where v.user_id = uid for update;
  end if;

  if expected_version <> current_version then
    return query select false, current_version;
    return;
  end if;

  update public.vaults v
    set prev_envelope = v.envelope,
        prev_version = v.version,
        envelope = new_envelope,
        version = v.version + 1,
        updated_at = now()
    where v.user_id = uid;
  return query select true, current_version + 1;
end;
$$;

-- Atomic replace (Reset cloud copy): ONE statement, so there is never a moment without a row.
-- Inserts version 1 when there is no row; otherwise keeps the current envelope as the previous one and bumps the version.
create function public.reset_vault(new_envelope jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_version bigint;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if octet_length(new_envelope::text) > 5242880 then
    raise exception 'vault too large';
  end if;

  insert into public.vaults as v (user_id, version, envelope)
    values (uid, 1, new_envelope)
    on conflict (user_id) do update
      set prev_envelope = v.envelope,
          prev_version = v.version,
          envelope = excluded.envelope,
          version = v.version + 1,
          updated_at = now()
    returning v.version into new_version;
  return new_version;
end;
$$;

revoke all on function public.push_vault(bigint, jsonb) from public, anon;
revoke all on function public.reset_vault(jsonb) from public, anon;
grant execute on function public.push_vault(bigint, jsonb) to authenticated;
grant execute on function public.reset_vault(jsonb) to authenticated;
