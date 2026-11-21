-- =====================================================================
--  Sistema Web: "Ventas cerradas" de Redes se llena sola con las llamadas
--  Cuenta como venta una llamada cuyo "Cierre" cuenta como venta (ej. "Sí")
--  o cuyo "Estado" cuenta como ganado (ej. "Cerrada").
--  El día es la fecha de la llamada (o, si está vacía, el día que se agendó).
--  Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
--  Se puede ejecutar más de una vez.
-- =====================================================================

-- Día al que corresponde una llamada
create or replace function public.call_day(p_date date, p_booked date)
returns date language sql immutable as $$ select coalesce(p_date, p_booked) $$;

-- Recalcula las ventas cerradas de un día
create or replace function public.recount_sales(p_day date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_day is null then return; end if;
  insert into public.daily_metrics (stat_date, sales_closed)
  select p_day, count(*)::int
  from public.calls c
  where public.call_day(c.scheduled_date, c.scheduled_on) = p_day
    and (
      exists (select 1 from public.option_lists o
              where o.list_key = 'cierre' and o.is_won and o.value = c.close_result)
      or exists (select 1 from public.call_statuses s where s.id = c.status_id and s.is_won)
    )
  on conflict (stat_date) do update set sales_closed = excluded.sales_closed, updated_at = now();
end $$;

-- Cuando se agrega, cambia o borra una llamada
create or replace function public.calls_recount_sales()
returns trigger language plpgsql security definer set search_path = public as $$
declare d_old date; d_new date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    d_old := public.call_day(old.scheduled_date, old.scheduled_on);
    perform public.recount_sales(d_old);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    d_new := public.call_day(new.scheduled_date, new.scheduled_on);
    if d_new is distinct from d_old then perform public.recount_sales(d_new); end if;
  end if;
  return null;
end $$;

drop trigger if exists calls_recount_sales on public.calls;
create trigger calls_recount_sales
  after insert or delete or update of scheduled_date, scheduled_on, close_result, status_id on public.calls
  for each row execute function public.calls_recount_sales();

-- Recalcula todos los días que tienen llamadas o ventas cargadas
create or replace function public.recount_all_sales()
returns void language plpgsql security definer set search_path = public as $$
declare d date;
begin
  for d in
    select public.call_day(scheduled_date, scheduled_on) from public.calls
    union
    select stat_date from public.daily_metrics where coalesce(sales_closed, 0) <> 0
  loop
    perform public.recount_sales(d);
  end loop;
end $$;

-- Si se cambia qué opciones de "Cierre" o qué estados cuentan como venta
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

drop trigger if exists statuses_recount_sales on public.call_statuses;
create trigger statuses_recount_sales
  after insert or delete or update on public.call_statuses
  for each statement execute function public.options_recount_sales();

-- Recalcular con las llamadas que ya están cargadas
select public.recount_all_sales();
