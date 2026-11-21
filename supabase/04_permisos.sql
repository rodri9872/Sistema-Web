-- =====================================================================
--  Sistema Web: permisos de las tablas para la aplicación
--  Los proyectos nuevos de Supabase no dan acceso automático a las tablas
--  creadas por SQL. Este archivo se lo da a los usuarios con sesión
--  iniciada (la seguridad fila por fila sigue activa).
--  Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
--  Se puede ejecutar más de una vez.
-- =====================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Para tablas que se creen más adelante
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
