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

-- Cada usuário vê apenas seus próprios dados
create policy "participante ve seus dados"
  on public.participantes for select
  using (auth.uid() = user_id);

-- Resultado visível para todos (para exibir na página pública)
create policy "resultado visivel para todos"
  on public.resultado for select
  using (true);
