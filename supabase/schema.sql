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

-- "Generate with AI": a per-user daily counter. The server calls use_ai_credit
-- with the signed-in user's token before each generation.
create table if not exists public.ai_usage (
  user_id uuid    not null references auth.users (id) on delete cascade,
  day     date    not null,
  count   integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "Users read their own AI usage" on public.ai_usage;
create policy "Users read their own AI usage" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

-- Adds one use for today (India time) and returns how many are left; -1 when over the limit.
create or replace function public.use_ai_credit(p_limit integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  used integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  insert into public.ai_usage (user_id, day, count)
  values (auth.uid(), (now() at time zone 'Asia/Kolkata')::date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into used;
  return case when used > p_limit then -1 else p_limit - used end;
end $$;

revoke execute on function public.use_ai_credit(integer) from public, anon;
grant execute on function public.use_ai_credit(integer) to authenticated;
