import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import polyfillNode from 'rollup-plugin-polyfill-node';

export default defineConfig({
  plugins: [tailwindcss(),react()],
  optimizeDeps: {
    include: ['buffer', 'process', 'util', 'stream'],
  },
  build: {
    rollupOptions: {
      plugins: [polyfillNode()],
    },
  },
  define: {
    global: 'globalThis',
  },
  
})
