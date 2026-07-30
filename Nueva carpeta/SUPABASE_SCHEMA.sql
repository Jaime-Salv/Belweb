-- BEL & JAIME - ESQUEMA RECOMENDADO PARA SUPABASE
-- Ejecutar en SQL Editor cuando queráis activar la versión compartida real.

create extension if not exists pgcrypto;

create table if not exists couple_members (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (display_name in ('Bel','Jaime')),
  created_at timestamptz not null default now()
);

create table if not exists capsules (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references couple_members(id) on delete cascade,
  recipient_id uuid not null references couple_members(id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  open_at timestamptz not null,
  secret_date boolean not null default false,
  opened_at timestamptz,
  constraint different_people check (author_id <> recipient_id)
);

create table if not exists travel_wishlist (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references couple_members(id) on delete cascade,
  destination text not null,
  created_at timestamptz not null default now()
);

create table if not exists food_wishlist (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references couple_members(id) on delete cascade,
  place text not null,
  created_at timestamptz not null default now()
);

alter table couple_members enable row level security;
alter table capsules enable row level security;
alter table travel_wishlist enable row level security;
alter table food_wishlist enable row level security;

-- Ambos miembros autenticados pueden verse entre sí.
create policy "members_read_members"
on couple_members for select
to authenticated
using (true);

-- Autor puede ver su cápsula completa.
create policy "author_reads_capsules"
on capsules for select
to authenticated
using (author_id = auth.uid());

-- NOTA IMPORTANTE:
-- No conviene permitir al destinatario SELECT directo sobre message antes de open_at.
-- Para máxima privacidad, exponer las cápsulas del destinatario mediante una función/RPC
-- que solo devuelva message cuando now() >= open_at.
-- Esto evita que alguien inspeccione la API o el navegador y lea antes de tiempo.

create policy "author_inserts_capsules"
on capsules for insert
to authenticated
with check (author_id = auth.uid());

create policy "members_manage_travel"
on travel_wishlist for all
to authenticated
using (true)
with check (created_by = auth.uid());

create policy "members_manage_food"
on food_wishlist for all
to authenticated
using (true)
with check (created_by = auth.uid());

-- RPC segura para abrir una cápsula.
create or replace function open_capsule(p_capsule_id uuid)
returns table (
  id uuid,
  title text,
  message text,
  author_id uuid,
  recipient_id uuid,
  created_at timestamptz,
  open_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select c.id, c.title, c.message, c.author_id, c.recipient_id, c.created_at, c.open_at
  from capsules c
  where c.id = p_capsule_id
    and c.recipient_id = auth.uid()
    and now() >= c.open_at;
end;
$$;

revoke all on function open_capsule(uuid) from public;
grant execute on function open_capsule(uuid) to authenticated;
