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
  repo: string;  // Primary display name (remote repo or local folder)
  subtitle?: string;  // File name for single files, file count for groups
  files: ModelFile[];
  totalSize: number;
  sizeFormatted: string;
  source: 'huggingface' | 'llamacpp';
  type: 'gguf' | 'safetensors' | 'pytorch' | 'other' | 'mixed';
  lastModified: string;
  fileListTooltip?: string;  // Comma-separated list of files for tooltip
}

declare global {
  interface Window {
    electronAPI?: {
      scanModels: () => Promise<ModelGroup[]>;
      deleteModel: (paths: string[]) => Promise<boolean>;
    };
  }
}
