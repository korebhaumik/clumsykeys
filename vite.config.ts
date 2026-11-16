import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { isPublicSupabaseKey, publicSupabaseError } from './src/lib/services/public-config'
import { seoPlugin } from './scripts/seo-plugin'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  for (const [name, value] of Object.entries(env)) {
    if (value && (/SECRET|SERVICE_ROLE|PASSWORD|PRIVATE_KEY|ACCESS_TOKEN/i.test(name) ||
      value.includes('sb_secret_') || (value.startsWith('eyJ') && !isPublicSupabaseKey(value)))) {
      throw new Error(`Unsafe client environment variable: ${name}. Keep credentials on the server.`);
    }
  }
  const error = publicSupabaseError(env.VITE_SUPABASE_URL?.trim(), env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim());
  if (error) throw new Error(error);
  const site = loadEnv(mode, process.cwd(), 'SITE_');
  return { plugins: [seoPlugin(site.SITE_URL), tailwindcss(), svelte()], build: { sourcemap: false } };
})
