import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    host: true,
    // true disables Vite's Host-header allowlist entirely. This dev server
    // is only ever reached over a trusted LAN/loopback, so the DNS-rebinding
    // protection that allowedHosts exists for doesn't apply here — and a
    // fixed allowlist (e.g. ['.nip.io']) silently blocks anyone opening the
    // app by raw LAN IP (192.168.x.x), which has no way to be wildcarded.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
      },
    },
  },
})
