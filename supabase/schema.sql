-- wemakesucess: accounts and "My Documents" sync.
-- Run once in Supabase → SQL Editor. Safe to re-run.

create table if not exists public.documents (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         uuid        not null,
  title      text        not null default 'My Resume' check (char_length(title) <= 120),
  tags       text[]      not null default '{}' check (cardinality(tags) <= 10),
  data       jsonb       not null,
  -- Server-signed proof of a ₹299 purchase for this resume (checked again by /api/pdf).
  unlock     jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set when the document is deleted, so other devices remove it too.
  deleted_at timestamptz,
  primary key (user_id, id),
  constraint documents_data_size check (pg_column_size(data) < 400000)
);

alter table public.documents enable row level security;

drop policy if exists "Users manage their own documents" on public.documents;
create policy "Users manage their own documents" on public.documents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- At most 200 documents per account, to keep the free tier comfortable.
create or replace function public.documents_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- An upsert of an existing document is an update, not a new one.
  if exists (select 1 from public.documents where user_id = new.user_id and id = new.id) then
    return new;
  end if;
  if (select count(*) from public.documents where user_id = new.user_id) >= 200 then
    raise exception 'document limit reached';
  end if;
  return new;
end $$;

drop trigger if exists documents_limit on public.documents;
create trigger documents_limit before insert on public.documents
  for each row execute function public.documents_limit();
