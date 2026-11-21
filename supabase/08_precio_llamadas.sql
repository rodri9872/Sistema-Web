-- =====================================================================
--  Sistema Web: precio de venta y moneda en cada llamada
--  Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
--  Se puede ejecutar más de una vez.
-- =====================================================================
alter table public.calls add column if not exists price numeric(12,2);  -- Precio de venta (si está vacío se usa el del plan)
alter table public.calls add column if not exists currency text;        -- EUR / USD
