-- =====================================================================
--  Sistema Web: ingreso con NOMBRE DE USUARIO (sin correo)
--  Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
--  Ejecutalo después de schema.sql. Se puede ejecutar más de una vez.
--
--  Cómo funciona: cada usuario tiene un nombre de usuario (ej. "rodrigo").
--  Por dentro, Supabase necesita un correo, así que se usa uno ficticio
--  "rodrigo@usuarios.local" que nadie ve ni recibe mails.
--  Solo un administrador puede crear usuarios.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Normaliza y valida un nombre de usuario
create or replace function public.clean_username(u text)
returns text language plpgsql immutable as $$
declare v text := lower(trim(coalesce(u, '')));
begin
  if v !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    raise exception 'El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo (sin espacios ni tildes).';
  end if;
  return v;
end $$;

create or replace function public.username_email(u text)
returns text language sql immutable as $$ select public.clean_username(u) || '@usuarios.local' $$;

-- ---------- Alta de usuarios en auth (uso interno) ----------
create or replace function public._create_auth_user(p_username text, p_password text, p_full_name text, p_role text)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare
  v_id uuid := gen_random_uuid();
  v_user text := public.clean_username(p_username);
  v_email text := public.username_email(p_username);
begin
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres.';
  end if;
  if p_role not in ('admin', 'usuario') then
    raise exception 'Rol inválido.';
  end if;
  if exists (select 1 from public.profiles where lower(username) = v_user)
     or exists (select 1 from auth.users where email = v_email) then
    raise exception 'Ya existe un usuario "%".', v_user;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                       'username', v_user, 'app_role', p_role),
    jsonb_build_object('full_name', coalesce(nullif(trim(p_full_name), ''), v_user)),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  return v_id;
end $$;
revoke all on function public._create_auth_user(text, text, text, text) from public, anon, authenticated;

-- ---------- Perfil automático al crear un usuario ----------
-- Solo los usuarios creados por el sistema quedan activos. Si alguien se
-- registrara por fuera (con correo), queda bloqueado.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, username, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_app_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    new.raw_app_meta_data->>'username',
    coalesce(new.raw_app_meta_data->>'app_role', 'usuario'),
    new.raw_app_meta_data->>'username' is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.block_unmanaged_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_app_meta_data->>'username' is null then
    new.banned_until := '2999-12-31'::timestamptz;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_block on auth.users;
create trigger on_auth_user_block before insert on auth.users
  for each row execute function public.block_unmanaged_user();

-- ---------- Funciones que usa la aplicación ----------

-- ¿Hay que crear el superusuario inicial? (lo consulta la pantalla de ingreso)
create or replace function public.needs_setup()
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where role = 'admin' and active and username is not null);
$$;
grant execute on function public.needs_setup() to anon, authenticated;

-- Crea el superusuario inicial. Solo funciona si todavía no hay ninguno.
create or replace function public.create_first_admin(p_username text, p_password text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.needs_setup() then
    raise exception 'El administrador inicial ya fue creado.';
  end if;
  return public._create_auth_user(p_username, p_password, p_full_name, 'admin');
end $$;
grant execute on function public.create_first_admin(text, text, text) to anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

-- El administrador crea un usuario nuevo
create or replace function public.admin_create_user(p_username text, p_password text, p_full_name text, p_role text default 'usuario')
returns uuid language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede crear usuarios.'; end if;
  return public._create_auth_user(p_username, p_password, p_full_name, coalesce(p_role, 'usuario'));
end $$;
grant execute on function public.admin_create_user(text, text, text, text) to authenticated;

-- El administrador cambia la contraseña de cualquier usuario
create or replace function public.admin_set_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede cambiar contraseñas de otros.'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'La contraseña debe tener al menos 6 caracteres.'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = p_user;
end $$;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- El administrador borra un usuario (sus clientes y llamadas quedan sin asignar)
create or replace function public.admin_delete_user(p_user uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Solo un administrador puede borrar usuarios.'; end if;
  if p_user = auth.uid() then raise exception 'No podés borrar tu propio usuario.'; end if;
  delete from auth.users where id = p_user;
end $$;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------- Reglas al editar perfiles ----------
-- Un usuario común solo puede cambiar su nombre. El administrador además
-- cambia usuario, rol y si está activo; esos cambios se aplican al ingreso.
create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public, auth as $$
begin
  if current_setting('app.migrando', true) = 'si' then
    return new;
  end if;
  if not public.is_admin() then
    new.role := old.role;
    new.active := old.active;
    new.username := old.username;
  else
    if old.id = auth.uid() and (new.role <> 'admin' or not new.active) then
      raise exception 'No podés quitarte el rol de administrador ni desactivarte a vos mismo.';
    end if;
  end if;

  if new.username is distinct from old.username then
    new.username := public.clean_username(new.username);
    if exists (select 1 from public.profiles where lower(username) = new.username and id <> new.id) then
      raise exception 'Ya existe un usuario "%".', new.username;
    end if;
    new.email := public.username_email(new.username);
    update auth.users
      set email = new.email,
          raw_app_meta_data = raw_app_meta_data || jsonb_build_object('username', new.username),
          updated_at = now()
      where id = new.id;
    update auth.identities
      set identity_data = identity_data || jsonb_build_object('email', new.email)
      where user_id = new.id and provider = 'email';
  end if;

  if new.active is distinct from old.active then
    update auth.users set banned_until = case when new.active then null else '2999-12-31'::timestamptz end where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- ---------- Usuarios que ya existían con correo ----------
-- Se les asigna como usuario la parte del correo antes de la @ y pasan a
-- ingresar con ese usuario. La contraseña no cambia.
do $$
declare r record; v text; n int;
begin
  perform set_config('app.migrando', 'si', true);
  for r in select p.id, p.email from public.profiles p join auth.users u on u.id = p.id
           where p.username is null and u.banned_until is null loop
    v := regexp_replace(lower(split_part(coalesce(r.email, 'usuario'), '@', 1)), '[^a-z0-9._-]', '', 'g');
    if length(v) < 3 then v := v || 'usr'; end if;
    v := left(v, 26);
    n := 1;
    while exists (select 1 from public.profiles where lower(username) = v) loop
      n := n + 1; v := left(v, 26) || n::text;
    end loop;
    update auth.users
      set email = v || '@usuarios.local',
          raw_app_meta_data = raw_app_meta_data || jsonb_build_object('username', v),
          email_confirmed_at = coalesce(email_confirmed_at, now())
      where id = r.id;
    update auth.identities
      set identity_data = identity_data || jsonb_build_object('email', v || '@usuarios.local')
      where user_id = r.id and provider = 'email';
    update public.profiles set username = v, email = v || '@usuarios.local', active = true where id = r.id;
  end loop;
  perform set_config('app.migrando', '', true);
end $$;

-- ---------- Permisos de perfiles ----------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "perfil_edita" on public.profiles;
create policy "perfil_edita" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
