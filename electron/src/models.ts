import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

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

const HF_CACHE_DIR = path.join(homedir(), '.cache', 'huggingface', 'hub');
const LLAMA_CACHE_DIR = process.platform === 'darwin' 
  ? path.join(homedir(), 'Library', 'Caches', 'llama.cpp')
  : path.join(homedir(), '.cache', 'llama.cpp');

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getModelType(filePath: string): ModelFile['type'] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.gguf') return 'gguf';
  if (ext === '.safetensors') return 'safetensors';
  if (ext === '.bin' || ext === '.pt' || ext === '.pth') return 'pytorch';
  return 'other';
}

function parseHfRepoName(dirName: string): string | undefined {
  if (!dirName.startsWith('models--')) return undefined;
  const parts = dirName.replace('models--', '').split('--');
  if (parts.length >= 2) {
    return `${parts[0]}/${parts.slice(1).join('-')}`;
  }
  return undefined;
}

async function scanDirectory(dirPath: string, source: ModelGroup['source']): Promise<ModelGroup[]> {
  const files: ModelFile[] = [];
  
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (source === 'huggingface') {
        if (entry.isDirectory() && entry.name.startsWith('models--')) {
          const repo = parseHfRepoName(entry.name);
          const snapshotsDir = path.join(fullPath, 'snapshots');
          
          try {
            const snapshots = await fs.promises.readdir(snapshotsDir, { withFileTypes: true });
            
            for (const snapshot of snapshots) {
              if (snapshot.isDirectory()) {
                const snapshotPath = path.join(snapshotsDir, snapshot.name);
                const snapshotFiles = await fs.promises.readdir(snapshotPath, { withFileTypes: true });
                
                for (const file of snapshotFiles) {
                  if (file.isFile() || file.isSymbolicLink()) {
                    const filePath = path.join(snapshotPath, file.name);
                    const stats = await fs.promises.stat(filePath);
                    const type = getModelType(file.name);
                    
                    if (type !== 'other' || file.name.endsWith('.json')) {
                      files.push({
                        id: `${entry.name}/${snapshot.name}/${file.name}`,
                        name: file.name,
                        path: filePath,
                        size: stats.size,
                        type,
                        revision: snapshot.name,
                        lastModified: stats.mtime.toISOString(),
                      });
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Snapshots dir might not exist
          }
        }
      } else if (source === 'llamacpp') {
        if (entry.isFile() && entry.name.endsWith('.gguf') && !entry.name.endsWith('.json')) {
          const stats = await fs.promises.stat(fullPath);
          const baseName = entry.name.replace('.gguf', '');
          const metadataPath = path.join(dirPath, `${baseName}.gguf.json`);
          
          let repo: string | undefined;
          try {
            const metadataContent = await fs.promises.readFile(metadataPath, 'utf-8');
            const metadata = JSON.parse(metadataContent);
            if (metadata.url) {
              const match = metadata.url.match(/huggingface\.co\/([^/]+\/[^/]+)/);
              repo = match ? match[1] : metadata.url;
            }
          } catch (e) {
            // No metadata
          }
          
          const file: ModelFile & { repo?: string } = {
            id: `llamacpp-${entry.name}`,
            name: entry.name,
            path: fullPath,
            size: stats.size,
            type: 'gguf',
            lastModified: stats.mtime.toISOString(),
          };
          if (repo) file.repo = repo;
          files.push(file);
        }
      }
    }
  } catch (e) {
    // Directory might not exist
  }
  
  // Group files by repo
  const groups = new Map<string, ModelFile[]>();
  const ungrouped: ModelFile[] = [];
  
  for (const file of files) {
    const fileWithRepo = file as ModelFile & { repo?: string };
    const repo = fileWithRepo.repo || (source === 'huggingface' ? parseHfRepoName(file.id.split('/')[0]) : undefined);
    
    if (repo) {
      if (!groups.has(repo)) {
        groups.set(repo, []);
      }
      groups.get(repo)!.push(file);
    } else {
      ungrouped.push(file);
    }
  }
  
  // Create ModelGroups
  const result: ModelGroup[] = [];
  
  for (const [repo, repoFiles] of groups) {
    const totalSize = repoFiles.reduce((sum, f) => sum + f.size, 0);
    const types = new Set(repoFiles.map(f => f.type));
    const lastModified = repoFiles
      .map(f => new Date(f.lastModified).getTime())
      .sort((a, b) => b - a)[0];
    
    result.push({
      id: `group-${repo}`,
      repo,
      subtitle: repoFiles.length === 1 ? repoFiles[0].name : `${repoFiles.length} files`,
      files: repoFiles,
      totalSize,
      sizeFormatted: formatBytes(totalSize),
      source,
      type: types.size === 1 ? Array.from(types)[0] : 'mixed',
      lastModified: new Date(lastModified).toISOString(),
      fileListTooltip: repoFiles.map(f => f.name).join(', '),
    });
  }
  
  // Add ungrouped files as individual groups
  for (const file of ungrouped) {
    result.push({
      id: file.id,
      repo: file.name,
      subtitle: undefined,
      files: [file],
      totalSize: file.size,
      sizeFormatted: formatBytes(file.size),
      source,
      type: file.type,
      lastModified: file.lastModified,
    });
  }
  
  return result.sort((a, b) => b.totalSize - a.totalSize);
}

export async function scanAllModels(): Promise<ModelGroup[]> {
  const hfGroups = await scanDirectory(HF_CACHE_DIR, 'huggingface');
  const llamaGroups = await scanDirectory(LLAMA_CACHE_DIR, 'llamacpp');
  
  return [...hfGroups, ...llamaGroups].sort((a, b) => b.totalSize - a.totalSize);
}

export async function deleteModelGroup(group: ModelGroup): Promise<boolean> {
  try {
    for (const file of group.files) {
      await fs.promises.unlink(file.path);
      
      // Delete llama.cpp metadata JSON if exists
      if (file.path.endsWith('.gguf')) {
        const metadataPath = `${file.path}.json`;
        try {
          await fs.promises.unlink(metadataPath);
        } catch (e) {
          // Metadata might not exist
        }
      }
    }
    return true;
  } catch (e) {
    console.error('Failed to delete model group:', e);
    return false;
  }
}
