-- =====================================================================
--  Sistema Web: plan en cada llamada
--  Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
-- =====================================================================
alter table public.calls add column if not exists plan_id bigint references public.plans(id) on delete set null;
