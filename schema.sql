-- Vendeon AI: schema inicial multiempresa para Supabase.
-- Execute no SQL Editor de um projeto NOVO. Nunca exponha a service_role key no navegador.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  interest text,
  stage text not null default 'Novo' check (stage in ('Novo','Em contato','Negociação','Ganho','Perdido')),
  value numeric(12,2) not null default 0 check (value >= 0),
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists products_org_idx on public.products(organization_id);
create index if not exists leads_org_idx on public.leads(organization_id);

create or replace function public.current_org_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select organization_id from public.memberships where user_id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare org_id uuid;
begin
  insert into public.organizations(name)
  values (coalesce(nullif(new.raw_user_meta_data->>'company_name',''), 'Minha empresa'))
  returning id into org_id;
  insert into public.memberships(organization_id,user_id,role)
  values (org_id,new.id,'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_vendeon on auth.users;
create trigger on_auth_user_created_vendeon
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.products enable row level security;
alter table public.leads enable row level security;

drop policy if exists "members can view their organizations" on public.organizations;
create policy "members can view their organizations" on public.organizations
for select to authenticated using (id in (select public.current_org_ids()));

drop policy if exists "members can view memberships in their org" on public.memberships;
create policy "members can view memberships in their org" on public.memberships
for select to authenticated using (organization_id in (select public.current_org_ids()));

drop policy if exists "members manage products in their org" on public.products;
create policy "members manage products in their org" on public.products
for all to authenticated
using (organization_id in (select public.current_org_ids()))
with check (organization_id in (select public.current_org_ids()));

drop policy if exists "members manage leads in their org" on public.leads;
create policy "members manage leads in their org" on public.leads
for all to authenticated
using (organization_id in (select public.current_org_ids()))
with check (organization_id in (select public.current_org_ids()));

-- Preenche organization_id automaticamente para inserções feitas por usuários.
create or replace function public.set_org_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare org_id uuid;
begin
  select organization_id into org_id
  from public.memberships where user_id = auth.uid()
  order by created_at asc limit 1;
  if org_id is null then raise exception 'Nenhuma organização associada a este usuário'; end if;
  new.organization_id := org_id;
  return new;
end;
$$;

drop trigger if exists products_set_org on public.products;
create trigger products_set_org before insert on public.products
for each row execute procedure public.set_org_id();

drop trigger if exists leads_set_org on public.leads;
create trigger leads_set_org before insert on public.leads
for each row execute procedure public.set_org_id();

grant usage on schema public to authenticated;
grant select on public.organizations, public.memberships to authenticated;
grant select, insert, update, delete on public.products, public.leads to authenticated;
