export default function SetupRequired() {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#22133d_0,#0a0a0f_42%)] px-4">
      <section className="card max-w-2xl">
        <h1 className="font-heading text-3xl font-extrabold">
          <span className="text-paisa-accentLight">paisa</span> coach 💸
        </h1>
        <p className="mt-4 text-paisa-muted">
          The app is running, but Firebase is not configured yet. Add your Firebase web app values to <code className="rounded bg-black/30 px-1">.env.local</code>, then restart Vite.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl border border-paisa-border bg-[#090910] p-4 text-sm text-paisa-muted">{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GROQ_API_KEY=...`}</pre>
        <div className="mt-5 rounded-xl bg-paisa-hover p-4 text-sm text-paisa-muted">
          <p className="font-bold text-paisa-text">Run it locally:</p>
          <p className="mt-2"><code>cd "/Users/jayadasratra/Documents/New project/paisa-coach"</code></p>
          <p><code>npm install</code></p>
          <p><code>npm run dev</code></p>
        </div>
      </section>
    </main>
  );
}
