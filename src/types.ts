export interface ModelFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'gguf' | 'safetensors' | 'pytorch' | 'other';
  revision?: string;
  lastModified: string;
}

export interface ModelGroup {
  id: string;
  repo: string;
  subtitle?: string;
  files: ModelFile[];
  totalSize: number;
  sizeFormatted: string;
  source: 'huggingface' | 'llamacpp';
  type: 'gguf' | 'safetensors' | 'pytorch' | 'other' | 'mixed';
  lastModified: string;
  fileListTooltip?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      scanModels: () => Promise<ModelGroup[]>;
      deleteModel: (group: ModelGroup) => Promise<boolean>;
    };
  }
}
