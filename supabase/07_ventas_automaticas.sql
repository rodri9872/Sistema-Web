-- =====================================================================
--  Sistema Web: "Ventas cerradas" de Redes se llena sola con las llamadas
--  Cuenta las llamadas cuyo "Cierre" es una opción que cuenta como venta
--  (por defecto "Sí"), agrupadas por la fecha de la llamada.
--  Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
--  Se puede ejecutar más de una vez.
-- =====================================================================

-- Recalcula las ventas cerradas de un día
create or replace function public.recount_sales(p_day date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_day is null then return; end if;
  insert into public.daily_metrics (stat_date, sales_closed)
  select p_day, count(*)::int
  from public.calls c
  where c.scheduled_date = p_day
    and exists (select 1 from public.option_lists o
                where o.list_key = 'cierre' and o.is_won and o.value = c.close_result)
  on conflict (stat_date) do update set sales_closed = excluded.sales_closed, updated_at = now();
end $$;

-- Cuando se agrega, cambia o borra una llamada
create or replace function public.calls_recount_sales()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform public.recount_sales(old.scheduled_date); end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.scheduled_date is distinct from old.scheduled_date) then
    perform public.recount_sales(new.scheduled_date);
  end if;
  return null;
end $$;

drop trigger if exists calls_recount_sales on public.calls;
create trigger calls_recount_sales
  after insert or delete or update of scheduled_date, close_result on public.calls
  for each row execute function public.calls_recount_sales();

-- Recalcula todos los días que tienen llamadas
create or replace function public.recount_all_sales()
returns void language plpgsql security definer set search_path = public as $$
declare d date;
begin
  for d in select distinct scheduled_date from public.calls where scheduled_date is not null loop
    perform public.recount_sales(d);
  end loop;
end $$;

-- Si se cambia qué opciones de "Cierre" cuentan como venta
create or replace function public.options_recount_sales()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recount_all_sales();
  return null;
end $$;

drop trigger if exists options_recount_sales on public.option_lists;
create trigger options_recount_sales
  after insert or delete or update on public.option_lists
  for each statement execute function public.options_recount_sales();

-- Llenar con las llamadas que ya están cargadas
select public.recount_all_sales();
