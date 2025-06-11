import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    base: isProduction ? '/' : '/',  // Absoluter Pfad für Produktion
    define: {
      'import.meta.env.PROD': isProduction,
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
        isProduction 
          ? 'https://interaktive-umfrage-plattform-nechts.up.railway.app/api'
          : 'http://localhost:3001/api'
      )
    },
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
