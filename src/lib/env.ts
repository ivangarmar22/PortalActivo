function readEnv() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const issues: string[] = []
  if (!url || !URL.canParse(url)) issues.push('VITE_SUPABASE_URL debe ser una URL')
  if (!anonKey || anonKey.length < 20) issues.push('Falta VITE_SUPABASE_ANON_KEY')

  if (issues.length > 0 || !url || !anonKey) {
    throw new Error(
      `Configuración incompleta. Copia .env.example a .env.local y rellénalo con la salida de "npx supabase status".\n${issues
        .map((issue) => `· ${issue}`)
        .join('\n')}`,
    )
  }
  return { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey }
}

export const env = readEnv()
