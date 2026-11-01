-- B2All: enforce role permissions inside the database too, so nobody can bypass the app with direct API calls.

create or replace function public.can_any(p text[]) returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from profiles pr left join roles r on r.id = pr.staff_role_id
    where pr.id = auth.uid() and (pr.role = 'owner' or (pr.role = 'staff' and exists (
      select 1 from unnest(p) x where (r.perms -> split_part(x, '.', 1)) ? split_part(x, '.', 2)))))
$$;

do $$ declare t text; begin
  foreach t in array array['roles','invites','activity','parties','ledgers','orders','deliveries','invoices','contracts','vouchers','offer_sends','company'] loop
    execute format('drop policy if exists "staff all %1$s" on public.%1$s', t);
    execute format('drop policy if exists "staff read %1$s" on public.%1$s', t);
    execute format('drop policy if exists "staff insert %1$s" on public.%1$s', t);
    execute format('drop policy if exists "staff update %1$s" on public.%1$s', t);
    execute format('drop policy if exists "owner delete %1$s" on public.%1$s', t);
    execute format('create policy "staff read %1$s" on public.%1$s for select using (is_staff())', t);
    execute format('create policy "owner delete %1$s" on public.%1$s for delete using (is_owner())', t);
  end loop;
end $$;

create policy "staff insert parties" on public.parties for insert with check (can_any(array['crm.create','crm.edit','purchase.create','purchase.edit','sales.create']));
create policy "staff update parties" on public.parties for update using (can_any(array['crm.edit','purchase.edit','crm.create','purchase.create']));
create policy "staff insert ledgers" on public.ledgers for insert with check (is_staff());
create policy "staff update ledgers" on public.ledgers for update using (can_any(array['accounts.edit']));
create policy "staff insert orders" on public.orders for insert with check (can_any(array['sales.create','purchase.create']));
create policy "staff update orders" on public.orders for update using (can_any(array['sales.edit','purchase.edit']));
create policy "staff insert deliveries" on public.deliveries for insert with check (can_any(array['inventory.create']));
create policy "staff update deliveries" on public.deliveries for update using (can_any(array['sales.create','purchase.create','inventory.edit']));
create policy "staff insert invoices" on public.invoices for insert with check (can_any(array['sales.create','purchase.create']));
create policy "staff update invoices" on public.invoices for update using (can_any(array['sales.create','purchase.create']));
create policy "staff insert contracts" on public.contracts for insert with check (can_any(array['sales.create']));
create policy "staff update contracts" on public.contracts for update using (can_any(array['sales.edit']));
create policy "staff insert vouchers" on public.vouchers for insert with check (can_any(array['accounts.create','sales.create','purchase.create']));
create policy "staff update vouchers" on public.vouchers for update using (can_any(array['accounts.export','accounts.edit']));
create policy "staff insert offer_sends" on public.offer_sends for insert with check (can_any(array['crm.create']));
create policy "staff insert activity" on public.activity for insert with check (is_staff());
create policy "staff insert roles" on public.roles for insert with check (can_any(array['admin.edit']));
create policy "staff update roles" on public.roles for update using (can_any(array['admin.edit']));
create policy "staff insert invites" on public.invites for insert with check (can_any(array['admin.edit']));
create policy "staff insert company" on public.company for insert with check (can_any(array['admin.edit']));
create policy "staff update company" on public.company for update using (can_any(array['admin.edit']));

drop policy if exists "staff manages materials" on public.materials;
create policy "staff writes materials" on public.materials for insert with check (can_any(array['admin.edit']));
create policy "staff updates materials" on public.materials for update using (can_any(array['admin.edit']));

drop policy if exists "staff manages offers" on public.offers; drop policy if exists "customer reads offers" on public.offers;
create policy "staff read offers" on public.offers for select using (is_staff());
create policy "staff writes offers" on public.offers for insert with check (can_any(array['crm.create']));

drop policy if exists "staff updates enquiries" on public.enquiries;
create policy "staff updates enquiries" on public.enquiries for update using (can_any(array['crm.edit','sales.create']));

-- profiles: only owners and admins change other people (stops staff promoting themselves)
drop policy if exists "staff updates profiles" on public.profiles; drop policy if exists "staff inserts profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles for update using (can_any(array['admin.edit'])) with check (role <> 'owner' or is_owner());
create policy "admin inserts profiles" on public.profiles for insert with check (can_any(array['admin.edit']) and role <> 'owner');

-- functions callable only by signed-in sessions
-- actions only for signed-in sessions; the policy helpers stay callable because row rules use them (they return false for visitors)
revoke execute on function public.next_number(text), public.sign_contract(uuid, text, text), public.claim_invite() from public, anon;
grant execute on function public.next_number(text), public.sign_contract(uuid, text, text), public.claim_invite() to authenticated;

-- a person editing their own profile cannot change their role or staff role
drop policy if exists "update own profile (not role)" on public.profiles;
create policy "update own profile (not role)" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid())
              and staff_role_id is not distinct from (select p.staff_role_id from public.profiles p where p.id = auth.uid()));
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid() and role = 'customer' and staff_role_id is null);
