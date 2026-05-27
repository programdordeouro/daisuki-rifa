-- ============================================================
-- Daisuki Confeitaria — Supabase Setup
-- Cole e execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Tabela de participantes da rifa
create table if not exists public.participantes (
  id         uuid    default gen_random_uuid() primary key,
  user_id    uuid    references auth.users(id) on delete set null,
  nome       text    not null,
  social     text    not null,
  email      text    not null unique,
  telefone   text    not null,
  modalidade text    not null check (modalidade in ('fly', 'compra')),
  quantidade int     not null default 1,
  numeros    text[]  not null default '{}',
  created_at timestamptz default now()
);

-- Tabela de resultado do sorteio
create table if not exists public.resultado (
  id              int  primary key default 1,
  numero_sorteado text,
  nome_vencedor   text,
  data_sorteio    date,
  observacao      text,
  created_at      timestamptz default now()
);

-- Ativa Row Level Security
alter table public.participantes enable row level security;
alter table public.resultado     enable row level security;

-- Participante vê seus dados pelo email (funciona com magic link)
create policy "participante ve seus dados"
  on public.participantes for select
  using (auth.email() = email);

-- Resultado visível para todos
create policy "resultado visivel para todos"
  on public.resultado for select
  using (true);

-- ============================================================
-- Se já executou o SQL antes, rode só isto para corrigir a policy:
-- ============================================================
-- drop policy if exists "participante ve seus dados" on public.participantes;
-- create policy "participante ve seus dados"
--   on public.participantes for select
--   using (auth.email() = email);
