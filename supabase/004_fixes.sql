-- B2All: fixes found while testing the live database (applied 1 Nov 2026).

-- 1. next_number: the parameter "k" clashed with the column "k", so every new order, invoice, contract and voucher failed.
create or replace function public.next_number(k text) returns integer language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v integer;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  insert into counters as c (k, n) values (next_number.k, 1)
  on conflict (k) do update set n = c.n + 1
  returning c.n into v;
  return v;
end $$;
revoke execute on function public.next_number(text) from public, anon;
grant execute on function public.next_number(text) to authenticated;

-- 2. Row rules call these helpers for every visitor, so visitors must be able to run them (they return false/empty).
grant execute on function public.is_owner(), public.is_staff(), public.my_party_ids(), public.can_any(text[]) to anon;

-- 3. A staff member could change their own staff role (the WITH CHECK rule compared against the updated row).
--    A trigger now checks every role change before it happens.
create or replace function public.guard_profile_changes() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if (new.role is distinct from old.role or new.staff_role_id is distinct from old.staff_role_id) then
    if not can_any(array['admin.edit']) then raise exception 'Only an owner or admin can change roles'; end if;
    if (new.role = 'owner' or old.role = 'owner') and not is_owner() then raise exception 'Only an owner can change owner access'; end if;
    if new.id = auth.uid() and not is_owner() then raise exception 'You cannot change your own role'; end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_changes on public.profiles;
create trigger guard_profile_changes before update on public.profiles for each row execute function public.guard_profile_changes();
