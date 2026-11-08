-- Rafiq encrypted account sync: hardening of public.push_vault.
-- Safe to run after 0001_vaults.sql (create or replace, so it is idempotent: running it twice changes nothing).
-- It must be applied to every project that already ran 0001. Only push_vault changes: after the fallback lookup
-- (another call inserted the row first) a missing row now raises instead of returning (true, NULL).
-- The grants are re-asserted below because they are part of the function's contract.

-- Compare-and-swap push. Returns (true, new version) when accepted, (false, current version) when stale.
-- A missing row accepts only expected_version = 0 (inserts version 1). Envelopes over 5 MB (as text) are refused.
create or replace function public.push_vault(expected_version bigint, new_envelope jsonb)
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
    if not found then
      raise exception 'vault disappeared' using errcode = 'P0001';
    end if;
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

revoke all on function public.push_vault(bigint, jsonb) from public, anon;
grant execute on function public.push_vault(bigint, jsonb) to authenticated;
