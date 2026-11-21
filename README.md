# Sistema Web

Sistema para llevar **clientes, llamadas, planes y estadísticas de redes sociales**, con tablas que se usan como un Excel.

- **Inicio**: llamadas pendientes de hoy, del mes, concretadas, cierres, próximas llamadas y resumen por usuario.
- **Clientes**: plan, usuario a cargo, estado, notas y las columnas extra que quieras.
- **Llamadas agendadas**: como la hoja “Agendados”: fecha en que se agendó, setter, nombre, país, vía, estado, fecha y hora de la llamada, closer, realizada, cierre, tipo de pago y observaciones. Filtros: Hoy, Próximos 7 días, Atrasadas, Solo mías.
- **Planes**: nombre, precio y descripción.
- **Redes sociales**: registro diario como la planilla (un mes por hoja, un día por fila): nuevos seguidores, nuevas conversaciones, follow ups, propuestas de agenda, llamadas agendadas, ventas cerradas, ticket y facturación, con porcentajes y totales automáticos. Más estadísticas del mes y resumen por mes.
- **Configuración**: estados de llamadas y de clientes, listas desplegables (vía, cierre, tipo de pago), campos personalizados (columnas nuevas) y usuarios.

### Cómo se usan las tablas
- Doble clic o empezar a escribir para editar. Se guarda solo.
- Enter baja a la fila de abajo, como en Excel.
- Ctrl+C / Ctrl+V copia y pega, también bloques enteros copiados desde Excel.
- Ctrl+Z deshace. Supr borra la celda.
- Arrastrá los encabezados para reordenar columnas o cambiar el ancho; el sistema lo recuerda.
- Botón “Columnas” para ocultar o mostrar columnas. “Exportar a Excel (CSV)” descarga la tabla.

---

## Puesta en marcha (una sola vez)

### 1. Crear la base de datos en Supabase (gratis)
1. Entrá a https://supabase.com, creá una cuenta y tocá **New project**. Elegí un nombre y una contraseña (guardala).
2. Cuando el proyecto esté listo, en el menú de la izquierda andá a **SQL Editor** → **New query**.
3. Abrí el archivo [`supabase/schema.sql`](supabase/schema.sql) de este repositorio, copiá todo el contenido, pegalo y tocá **Run**. Debe decir “Success”.
4. Abrí otra consulta (**New query**) y hacé lo mismo con [`supabase/02_usuarios.sql`](supabase/02_usuarios.sql), después con [`supabase/03_redes_diario.sql`](supabase/03_redes_diario.sql) [`supabase/04_permisos.sql`](supabase/04_permisos.sql) (da permiso a la aplicación para usar las tablas), [`supabase/05_llamadas.sql`](supabase/05_llamadas.sql) , [`supabase/06_plan_en_llamadas.sql`](supabase/06_plan_en_llamadas.sql) y [`supabase/07_ventas_automaticas.sql`](supabase/07_ventas_automaticas.sql).
5. (Recomendado, por seguridad) En **Authentication → Sign In / Providers**, desactivá **Allow new users to sign up**. Los usuarios los crea el administrador desde el sistema.
6. Tocá el botón **Connect** arriba (o **Project Settings → API Keys**) y copiá dos datos:
   - **Project URL** (algo como `https://abcd.supabase.co`)
   - **Publishable key** (empieza con `sb_publishable_`; si ves “anon key”, sirve igual)

### 2. Publicar la web en Vercel (gratis)
1. Entrá a https://vercel.com e iniciá sesión con tu cuenta de GitHub.
2. **Add New → Project**, elegí el repositorio **Sistema-Web** y tocá **Import**.
3. En **Environment Variables** cargá:
   - `NEXT_PUBLIC_SUPABASE_URL` = la Project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = la Publishable key
4. Tocá **Deploy**. En un par de minutos te da la dirección de tu sistema.

### 3. Primer ingreso
Entrá a la dirección. La primera vez aparece **Configuración inicial**: elegí tu nombre, un **usuario** (por ejemplo `rodrigo`) y una contraseña. Ese es el **superusuario** (administrador).

Después, en **Configuración → Usuarios**, el administrador crea a los demás con **+ Nuevo usuario** (usuario, nombre, contraseña y rol). También puede cambiarles la contraseña, desactivarlos o borrarlos. Cada uno puede cambiar su propia contraseña desde el menú de la izquierda.

No se usa correo electrónico: todos ingresan con usuario y contraseña.

---

## Para programadores
Next.js 16 + TypeScript, Supabase (Postgres + Auth), AG Grid Community, Recharts.

```bash
cp .env.example .env.local   # completar los dos valores
npm install
npm run dev
```

- `supabase/schema.sql`: tablas, seguridad (RLS) y datos iniciales.
- `supabase/02_usuarios.sql`: ingreso por nombre de usuario (por dentro `usuario@usuarios.local`), superusuario inicial y funciones de administración de usuarios.
- `src/components/EditableGrid.tsx`: la grilla tipo Excel reutilizable (guarda cada celda en Supabase).
- `src/lib/grid.tsx`: columnas de lista, colores y campos personalizados (se guardan en la columna `custom` jsonb).
