/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Weitere Umgebungsvariablen hier definieren, falls benötigt
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
