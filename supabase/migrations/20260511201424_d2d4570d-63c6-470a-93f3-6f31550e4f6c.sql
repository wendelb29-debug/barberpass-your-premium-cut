
-- Roles enum
create type public.app_role as enum ('cliente', 'barbeiro', 'admin');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  asaas_customer_id text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_user_roles(_user_id uuid)
returns setof public.app_role
language sql stable security definer set search_path = public
as $$
  select role from public.user_roles where user_id = _user_id
$$;

-- Plans
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null,
  billing_cycle text not null default 'MONTHLY',
  benefits text[] not null default '{}',
  haircut_limit integer,
  beard_limit integer,
  unlimited boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;

-- Barbers
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  bio text,
  specialties text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.barbers enable row level security;

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  asaas_subscription_id text,
  status text not null default 'PENDING',
  billing_type text not null default 'PIX',
  next_due_date date,
  started_at timestamptz not null default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create index on public.subscriptions(user_id);

-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asaas_payment_id text unique,
  status text not null default 'PENDING',
  value_cents integer not null,
  due_date date,
  paid_at timestamptz,
  invoice_url text,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;

-- Appointments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  plan_id uuid references public.plans(id),
  scheduled_at timestamptz not null,
  service_type text not null default 'haircut',
  status text not null default 'scheduled',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
create index on public.appointments(scheduled_at);
create index on public.appointments(barber_id, scheduled_at);

-- RLS policies
-- profiles
create policy "profiles self read" on public.profiles for select using (auth.uid() = id or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'barbeiro'));
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles admin update" on public.profiles for update using (public.has_role(auth.uid(),'admin'));

-- user_roles
create policy "roles self read" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles admin all" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- plans (public read)
create policy "plans read" on public.plans for select using (true);
create policy "plans admin write" on public.plans for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- barbers
create policy "barbers read" on public.barbers for select using (true);
create policy "barbers admin write" on public.barbers for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- subscriptions
create policy "subs self read" on public.subscriptions for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "subs self insert" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subs self update" on public.subscriptions for update using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- payments
create policy "payments self read" on public.payments for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

-- appointments
create policy "appts self read" on public.appointments for select using (
  auth.uid() = user_id
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.barbers b where b.id = appointments.barber_id and b.user_id = auth.uid())
);
create policy "appts self insert" on public.appointments for insert with check (auth.uid() = user_id);
create policy "appts self update" on public.appointments for update using (
  auth.uid() = user_id
  or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.barbers b where b.id = appointments.barber_id and b.user_id = auth.uid())
);

-- Trigger to create profile + cliente role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'cliente') on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed plans
insert into public.plans (name, description, price_cents, billing_cycle, benefits, haircut_limit, beard_limit, unlimited, sort_order)
values
('Básico','Ideal para o essencial',6900,'MONTHLY', array['1 corte de cabelo por mês','Atendimento prioritário'], 1, 0, false, 1),
('Premium','O combo perfeito',11900,'MONTHLY', array['1 corte de cabelo','1 barba','Atendimento prioritário'], 1, 1, false, 2),
('VIP','Sem limites',17900,'MONTHLY', array['Cortes ilimitados','Barbas ilimitadas','Hidratação capilar','Atendimento VIP'], null, null, true, 3);
