import path from 'path';
import { defineConfig, loadEnv, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        mode === 'development'
          ? '/api'  // ✅ Kein doppeltes /api im Dev
          : env.VITE_API_BASE_URL || '/api'
      )
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        }
      }
    },
    plugins: [
      react(),
      splitVendorChunkPlugin()
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'charts': ['recharts', 'chart.js', 'react-chartjs-2'],
            'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector']
          }
        }
      }
    }
  };
});
