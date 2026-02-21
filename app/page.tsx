import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  let isConnected = false;

  try {
    const supabase = await createClient();
    await supabase.from('_ping').select('id').limit(1);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      isConnected = true;
    }
  } catch {
    isConnected = false;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">VR no Ponto - Home</h1>
      <p className="mt-4 text-xl">Bem-vindo(a) ao VR no Ponto</p>

      <div className="mt-8 p-6 rounded-lg bg-gray-100 dark:bg-gray-800 shadow-md">
        <p className="font-semibold text-xl flex items-center justify-center gap-3">
          Supabase:
          {isConnected ? (
            <span className="text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-900/50 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
              Conectado
            </span>
          ) : (
            <span className="text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-900/50 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
              Não Conectado
            </span>
          )}
        </p>
      </div>
    </main>
  );
}
