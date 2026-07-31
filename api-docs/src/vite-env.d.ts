/// <reference types="vite/client" />

declare module '*.yaml' {
  const value: any;
  export default value;
}

interface Window {
  electronAPI?: {
    saveToken: (token: string) => Promise<boolean>;
    loadToken: () => Promise<string | null>;
    deleteToken: () => Promise<boolean>;
    getApiConfig: () => Promise<any>;
    saveApiConfig: (config: any) => Promise<boolean>;
    showOpenDialog: (options: any) => Promise<any>;
    showSaveDialog: (options: any) => Promise<any>;
    platform: string;
    isElectron: boolean;
  };
}
