-- PreçoCerto — schema inicial
-- Cada usuário só acessa os próprios dados (RLS). Mercados e produtos formam um catálogo compartilhado.

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  current_period_end timestamptz,
  provider text,
  provider_reference text,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Catálogo compartilhado
-- ---------------------------------------------------------------------------
create table public.markets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  normalized_name text generated always as (lower(trim(name))) stored,
  city text,
  latitude double precision,
  longitude double precision,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index markets_normalized_name_city_idx on public.markets (normalized_name, coalesce(city, ''));
create index markets_name_trgm_idx on public.markets using gin (normalized_name gin_trgm_ops);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  size_value numeric,
  size_unit text check (size_unit in ('g', 'kg', 'ml', 'l', 'un', 'm')),
  ean text,
  normalized_key text not null unique,
  created_at timestamptz not null default now()
);
create index products_key_trgm_idx on public.products using gin (normalized_key gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Compras
-- ---------------------------------------------------------------------------
create table public.shoppings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  market_id uuid references public.markets (id) on delete set null,
  market_name text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'awaiting_receipt', 'checked')),
  item_count integer not null default 0,
  expected_total numeric(12, 2) not null default 0,
  paid_total numeric(12, 2),
  difference numeric(12, 2),
  divergence_count integer not null default 0,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);
create index shoppings_user_created_idx on public.shoppings (user_id, created_at desc);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  shopping_id uuid not null references public.shoppings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  brand text,
  description text,
  size_value numeric,
  size_unit text,
  price_unit text not null default 'un' check (price_unit in ('un', 'kg', 'l')),
  shelf_price numeric(12, 2) not null check (shelf_price >= 0),
  promo_price numeric(12, 2) check (promo_price is null or promo_price >= 0),
  promo_type text not null default 'none'
    check (promo_type in ('none', 'sale', 'multibuy', 'nth_unit_discount', 'min_quantity')),
  promo_buy_quantity numeric,
  promo_pay_quantity numeric,
  promo_nth_unit integer,
  promo_discount_percent numeric,
  quantity numeric(10, 3) not null default 1 check (quantity > 0),
  image_path text,
  confidence numeric(4, 3),
  raw_reading jsonb,
  created_at timestamptz not null default now()
);
create index shopping_items_shopping_idx on public.shopping_items (shopping_id);
create index shopping_items_user_created_idx on public.shopping_items (user_id, created_at);

-- Observação de preço na prateleira (uma por item fotografado).
create table public.shelf_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shopping_item_id uuid not null unique references public.shopping_items (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  market_id uuid references public.markets (id) on delete set null,
  price numeric(12, 2) not null,
  promo_price numeric(12, 2),
  price_unit text not null,
  observed_at timestamptz not null default now()
);
create index shelf_prices_product_idx on public.shelf_prices (product_id, observed_at desc);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  shopping_id uuid not null unique references public.shoppings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  image_path text,
  market_name text,
  issued_at text,
  subtotal numeric(12, 2),
  discount_total numeric(12, 2),
  total numeric(12, 2),
  confidence numeric(4, 3),
  raw_reading jsonb,
  created_at timestamptz not null default now()
);

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  line_number integer,
  code text,
  product_name text not null,
  quantity numeric(10, 3) not null default 1,
  unit text not null default 'un' check (unit in ('un', 'kg', 'l')),
  unit_price numeric(12, 2) not null,
  total_price numeric(12, 2) not null,
  discount numeric(12, 2) not null default 0
);
create index receipt_items_receipt_idx on public.receipt_items (receipt_id);

create table public.item_matches (
  id uuid primary key default gen_random_uuid(),
  shopping_id uuid not null references public.shoppings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  shopping_item_id uuid not null unique references public.shopping_items (id) on delete cascade,
  receipt_item_id uuid not null unique references public.receipt_items (id) on delete cascade,
  confidence numeric(4, 3) not null,
  status text not null check (status in ('auto', 'confirmed', 'pending', 'rejected', 'manual')),
  method text not null default 'lexical' check (method in ('lexical', 'semantic', 'manual')),
  expected_total numeric(12, 2),
  charged_total numeric(12, 2),
  difference numeric(12, 2),
  -- "Confirmar divergência": base futura de dados confiáveis de preço.
  divergence_confirmed boolean not null default false,
  divergence_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index item_matches_shopping_idx on public.item_matches (shopping_id);

-- ---------------------------------------------------------------------------
-- Histórico de preços: visão unificada (prateleira + caixa), respeitando RLS do usuário.
-- ---------------------------------------------------------------------------
create view public.price_history
with (security_invoker = true)
as
select
  sp.product_id,
  sp.market_id,
  s.market_name,
  coalesce(sp.promo_price, sp.price) as price,
  'shelf'::text as source,
  sp.observed_at,
  sp.user_id
from public.shelf_prices sp
join public.shopping_items si on si.id = sp.shopping_item_id
join public.shoppings s on s.id = si.shopping_id
where sp.product_id is not null
union all
select
  si.product_id,
  s.market_id,
  s.market_name,
  round(ri.total_price / nullif(ri.quantity, 0), 2) as price,
  'receipt'::text as source,
  coalesce(s.checked_at, m.created_at) as observed_at,
  m.user_id
from public.item_matches m
join public.shopping_items si on si.id = m.shopping_item_id
join public.receipt_items ri on ri.id = m.receipt_item_id
join public.shoppings s on s.id = m.shopping_id
where si.product_id is not null and m.status in ('auto', 'confirmed', 'manual');

-- ---------------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------------
create or replace function public.current_plan(p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select plan from public.subscriptions
      where user_id = p_user_id
        and status in ('active', 'trialing')
        and (current_period_end is null or current_period_end > now())),
    'free');
$$;

create or replace function public.monthly_product_count(p_user_id uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.shopping_items
  where user_id = p_user_id and created_at >= date_trunc('month', now());
$$;

-- Limite do plano gratuito aplicado no banco (não dá para burlar pelo app).
create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  free_limit constant integer := 80;
begin
  if public.current_plan(new.user_id) = 'free'
     and public.monthly_product_count(new.user_id) >= free_limit then
    raise exception 'PRODUCT_LIMIT_REACHED' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger shopping_items_enforce_limit
  before insert on public.shopping_items
  for each row execute function public.enforce_product_limit();

-- Registra a observação de preço da prateleira automaticamente.
create or replace function public.record_shelf_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shelf_prices (user_id, shopping_item_id, product_id, market_id, price, promo_price, price_unit, observed_at)
  select new.user_id, new.id, new.product_id, s.market_id, new.shelf_price, new.promo_price, new.price_unit, new.created_at
  from public.shoppings s where s.id = new.shopping_id
  on conflict (shopping_item_id) do update
    set product_id = excluded.product_id,
        price = excluded.price,
        promo_price = excluded.promo_price,
        price_unit = excluded.price_unit;
  return new;
end;
$$;

create trigger shopping_items_record_price
  after insert or update of shelf_price, promo_price, product_id, price_unit on public.shopping_items
  for each row execute function public.record_shelf_price();

-- Encontra ou cria o produto do catálogo a partir da leitura da etiqueta.
create or replace function public.upsert_product(
  p_name text,
  p_brand text,
  p_size_value numeric,
  p_size_unit text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  key text;
  product_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  key := regexp_replace(
    lower(unaccent_safe(concat_ws(' ', p_brand, p_name, p_size_value::text, p_size_unit))),
    '[^a-z0-9.]+', ' ', 'g');
  key := trim(key);
  insert into public.products (name, brand, size_value, size_unit, normalized_key)
  values (p_name, p_brand, p_size_value, p_size_unit, key)
  on conflict (normalized_key) do update set name = public.products.name
  returning id into product_id;
  return product_id;
end;
$$;

-- unaccent sem depender da extensão (que nem sempre está habilitada).
create or replace function public.unaccent_safe(input text)
returns text
language sql
immutable
as $$
  select translate(coalesce(input, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC');
$$;

-- Comparação entre mercados (dados agregados e anônimos de todos os usuários). Premium.
create or replace function public.market_price_comparison(p_product_id uuid, p_days integer default 60)
returns table (market_id uuid, market_name text, latest_price numeric, observed_at timestamptz, samples bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_plan() <> 'premium' then
    raise exception 'PREMIUM_REQUIRED' using errcode = 'P0001';
  end if;
  return query
  select distinct on (sp.market_id)
    sp.market_id,
    mk.name,
    coalesce(sp.promo_price, sp.price),
    sp.observed_at,
    count(*) over (partition by sp.market_id)
  from public.shelf_prices sp
  join public.markets mk on mk.id = sp.market_id
  where sp.product_id = p_product_id
    and sp.observed_at >= now() - make_interval(days => p_days)
  order by sp.market_id, sp.observed_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.markets enable row level security;
alter table public.products enable row level security;
alter table public.shoppings enable row level security;
alter table public.shopping_items enable row level security;
alter table public.shelf_prices enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.item_matches enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Assinatura: leitura própria; escrita só pelo backend (service role / webhook de pagamento).
create policy "read own subscription" on public.subscriptions
  for select using (user_id = auth.uid());

create policy "markets readable" on public.markets
  for select to authenticated using (true);
create policy "markets insertable" on public.markets
  for insert to authenticated with check (created_by = auth.uid());

create policy "products readable" on public.products
  for select to authenticated using (true);

create policy "own shoppings" on public.shoppings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own shopping items" on public.shopping_items
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.shoppings s where s.id = shopping_id and s.user_id = auth.uid())
  );

create policy "own shelf prices" on public.shelf_prices
  for select using (user_id = auth.uid());

create policy "own receipts" on public.receipts
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.shoppings s where s.id = shopping_id and s.user_id = auth.uid())
  );

create policy "own receipt items" on public.receipt_items
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.receipts r where r.id = receipt_id and r.user_id = auth.uid())
  );

create policy "own item matches" on public.item_matches
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.shoppings s where s.id = shopping_id and s.user_id = auth.uid())
    and exists (select 1 from public.shopping_items si where si.id = shopping_item_id and si.user_id = auth.uid())
    and exists (select 1 from public.receipt_items ri where ri.id = receipt_item_id and ri.user_id = auth.uid())
  );

grant execute on function public.current_plan(uuid) to authenticated;
grant execute on function public.monthly_product_count(uuid) to authenticated;
grant execute on function public.upsert_product(text, text, numeric, text) to authenticated;
grant execute on function public.market_price_comparison(uuid, integer) to authenticated;
revoke execute on function public.current_plan(uuid) from anon;
revoke execute on function public.monthly_product_count(uuid) from anon;

-- ---------------------------------------------------------------------------
-- Storage: fotos de etiquetas e cupons em pasta própria de cada usuário ({user_id}/...)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('scans', 'scans', false)
on conflict (id) do nothing;

create policy "scans read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scans insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scans update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "scans delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
