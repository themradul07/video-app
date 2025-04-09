import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(),react()],
  server: {
    allowedHosts: ['5f32-2409-4089-ab1b-c5d1-98a8-b244-665e-8ee.ngrok-free.app'],
  },
})
