export default function SetupNotice() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="card space-y-3">
        <h1 className="page-title">Falta conectar la base de datos</h1>
        <p className="text-sm text-slate-600">
          El sistema necesita dos datos de Supabase para funcionar: <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>. Cargalos en Vercel (Settings → Environment Variables) o en un
          archivo <code>.env.local</code> y volvé a abrir la página. Los pasos están en el archivo <code>README.md</code>.
        </p>
      </div>
    </main>
  );
}
