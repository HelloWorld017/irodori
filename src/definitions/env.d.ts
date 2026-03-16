declare global {
  interface ImportMetaEnv extends ImportMetaEnvExtra {}
  interface ImportMetaEnvExtra {
    BASE_PATH: string;
  }
}

export {};
