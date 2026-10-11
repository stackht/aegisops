import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build for Cloudflare Pages: no backend and no dev-server proxy are needed.
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
});
