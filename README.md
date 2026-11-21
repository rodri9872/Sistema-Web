# Sistema Web

Sistema para llevar **clientes, llamadas, planes y estadísticas de redes sociales**, con tablas que se usan como un Excel.

- **Inicio**: llamadas pendientes de hoy, del mes, concretadas, cierres, próximas llamadas y resumen por usuario.
- **Clientes**: plan, usuario a cargo, estado, notas y las columnas extra que quieras.
- **Llamadas**: fecha, hora, cliente, estado (agendada, concretada, cerrada…), usuario, resultado. Filtros: Hoy, Próximos 7 días, Atrasadas, Solo mías.
- **Planes**: nombre, precio y descripción.
- **Redes sociales**: cuentas, carga diaria (seguidores, conversaciones, mensajes, alcance) y gráficos.
- **Configuración**: estados de llamadas y de clientes, campos personalizados (columnas nuevas) y usuarios.

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
4. (Recomendado) En **Authentication → Sign In / Providers → Email**, desactivá **Confirm email** para que los usuarios puedan entrar sin confirmar el correo.
5. Tocá el botón **Connect** arriba (o **Project Settings → API Keys**) y copiá dos datos:
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
Entrá a la dirección, tocá **Crear cuenta** y registrate. **El primer usuario queda como administrador.** Los demás se registran igual y aparecen en Configuración → Usuarios.

---

## Para programadores
Next.js 16 + TypeScript, Supabase (Postgres + Auth), AG Grid Community, Recharts.

```bash
cp .env.example .env.local   # completar los dos valores
npm install
npm run dev
```

- `supabase/schema.sql`: tablas, seguridad (RLS) y datos iniciales.
- `src/components/EditableGrid.tsx`: la grilla tipo Excel reutilizable (guarda cada celda en Supabase).
- `src/lib/grid.tsx`: columnas de lista, colores y campos personalizados (se guardan en la columna `custom` jsonb).
