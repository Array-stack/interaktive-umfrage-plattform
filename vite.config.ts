import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',  // Wichtig für korrekte Pfade im Build
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            // Weitere große Bibliotheken können hier hinzugefügt werden
          }
        }
      },
      chunkSizeWarningLimit: 1000 // Erhöht das Warnlimit auf 1MB
    },
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        mode === 'development'
          ? 'http://localhost:3001/api'
          : env.VITE_API_BASE_URL || 'https://interaktive-umfrage-plattform-nechts.up.railway.app/api'
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
      // Proxy-Konfiguration für die Entwicklung beibehalten
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        }
      }
    }
  };
});
