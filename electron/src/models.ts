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
  deletePaths?: string[];
}

interface GroupAccumulator {
  deletePaths: Set<string>;
  files: Map<string, ModelFile>;
  id: string;
  repo: string;
  source: ModelGroup['source'];
  subtitles: Set<string>;
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

  const parts = dirName.slice('models--'.length).split('--');
  if (parts.length < 2 || !parts[0]) {
    return undefined;
  }

  return `${parts[0]}/${parts.slice(1).join('--')}`;
}

function parseRepoFromUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  const match = url.match(/huggingface\.co\/([^/]+\/[^/]+)/);
  return match ? match[1] : undefined;
}

function parseLlamaRepoFromFileName(fileName: string): string | undefined {
  const normalizedName = fileName
    .replace(/\.json$/i, '')
    .replace(/\.etag$/i, '')
    .replace(/\.gguf$/i, '');
  const match = normalizedName.match(/^([^_]+)_([^_]+)_.+$/);

  if (!match) {
    return undefined;
  }

  return `${match[1]}/${match[2]}`;
}

function parseLlamaManifestInfo(fileName: string): { repo?: string; variant?: string } {
  if (!fileName.startsWith('manifest=') || !fileName.endsWith('.json')) {
    return {};
  }

  const stem = fileName.slice('manifest='.length, -'.json'.length);
  const parts = stem.split('=').filter(Boolean);

  if (parts.length === 0) {
    return {};
  }

  const variant = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const repoToken = parts.slice(0, -1).join('/');
  const repo = repoToken ? repoToken.replace(/_/g, '/') : undefined;

  return { repo, variant };
}

function normalizeDisplayPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

async function readDirectorySafe(dirPath: string): Promise<fs.Dirent[]> {
  try {
    return await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function statSafe(filePath: string): Promise<fs.Stats | undefined> {
  try {
    return await fs.promises.stat(filePath);
  } catch {
    return undefined;
  }
}

async function lstatSafe(filePath: string): Promise<fs.Stats | undefined> {
  try {
    return await fs.promises.lstat(filePath);
  } catch {
    return undefined;
  }
}

async function createModelFile(
  filePath: string,
  displayName: string,
  id: string,
  revision?: string
): Promise<ModelFile | undefined> {
  const stats = await statSafe(filePath) ?? await lstatSafe(filePath);
  if (!stats) {
    return undefined;
  }

  return {
    id,
    name: displayName,
    path: filePath,
    size: stats.size,
    type: getModelType(displayName),
    revision,
    lastModified: stats.mtime.toISOString(),
  };
}

async function walkFilesRecursive(dirPath: string): Promise<string[]> {
  const entries = await readDirectorySafe(dirPath);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkFilesRecursive(fullPath));
      continue;
    }

    if (entry.isFile() || entry.isSymbolicLink()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function getDirectoryStorageSize(dirPath: string): Promise<number> {
  const entries = await readDirectorySafe(dirPath);
  let totalSize = 0;

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      totalSize += await getDirectoryStorageSize(fullPath);
      continue;
    }

    const stats = await lstatSafe(fullPath);
    if (stats) {
      totalSize += stats.size;
    }
  }

  return totalSize;
}

function resolveGroupType(files: ModelFile[]): ModelGroup['type'] {
  const primaryTypes = Array.from(
    new Set(files.filter((file) => file.type !== 'other').map((file) => file.type))
  );

  if (primaryTypes.length === 0) {
    return 'other';
  }

  if (primaryTypes.length === 1) {
    return primaryTypes[0];
  }

  return 'mixed';
}

function sortFiles(files: ModelFile[]): ModelFile[] {
  return files.sort((left, right) => {
    const leftRank = left.type === 'other' ? 1 : 0;
    const rightRank = right.type === 'other' ? 1 : 0;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.name.localeCompare(right.name);
  });
}

function ensureGroup(
  groups: Map<string, GroupAccumulator>,
  key: string,
  repo: string,
  source: ModelGroup['source']
): GroupAccumulator {
  const existing = groups.get(key);
  if (existing) {
    return existing;
  }

  const group: GroupAccumulator = {
    deletePaths: new Set<string>(),
    files: new Map<string, ModelFile>(),
    id: `${source}:${key}`,
    repo,
    source,
    subtitles: new Set<string>(),
  };

  groups.set(key, group);
  return group;
}

function addFileToGroup(group: GroupAccumulator, file: ModelFile | undefined): void {
  if (!file) {
    return;
  }

  const existing = group.files.get(file.path);
  if (!existing || new Date(file.lastModified).getTime() >= new Date(existing.lastModified).getTime()) {
    group.files.set(file.path, file);
  }
}

function addDeletePath(group: GroupAccumulator, targetPath: string): void {
  if (!targetPath) {
    return;
  }

  group.deletePaths.add(path.resolve(targetPath));
}

function buildGroup(group: GroupAccumulator, totalSize?: number): ModelGroup | undefined {
  const files = sortFiles(Array.from(group.files.values()));

  if (files.length === 0 && group.deletePaths.size === 0) {
    return undefined;
  }

  const computedTotalSize = totalSize ?? files.reduce((sum, file) => sum + file.size, 0);
  const lastModified = files.reduce((latest, file) => {
    return Math.max(latest, new Date(file.lastModified).getTime());
  }, 0);
  const subtitles = Array.from(group.subtitles).filter(Boolean);

  return {
    id: group.id,
    repo: group.repo,
    subtitle: subtitles.length === 1 ? subtitles[0] : subtitles.length > 1 ? `${subtitles.length} variants` : undefined,
    files,
    totalSize: computedTotalSize,
    sizeFormatted: formatBytes(computedTotalSize),
    source: group.source,
    type: resolveGroupType(files),
    lastModified: new Date(lastModified || Date.now()).toISOString(),
    fileListTooltip: files.map((file) => file.name).join(', '),
    deletePaths: Array.from(group.deletePaths),
  };
}

async function scanHuggingFaceCache(dirPath: string): Promise<ModelGroup[]> {
  const entries = await readDirectorySafe(dirPath);
  const groups: ModelGroup[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('models--')) {
      continue;
    }

    const repo = parseHfRepoName(entry.name);
    if (!repo) {
      continue;
    }

    const repoRoot = path.join(dirPath, entry.name);
    const snapshotsDir = path.join(repoRoot, 'snapshots');
    const snapshotEntries = await readDirectorySafe(snapshotsDir);
    const logicalFiles = new Map<string, ModelFile>();
    let snapshotCount = 0;

    for (const snapshot of snapshotEntries) {
      if (!snapshot.isDirectory()) {
        continue;
      }

      snapshotCount += 1;
      const snapshotPath = path.join(snapshotsDir, snapshot.name);
      const snapshotFiles = await walkFilesRecursive(snapshotPath);

      for (const filePath of snapshotFiles) {
        const relativePath = normalizeDisplayPath(path.relative(snapshotPath, filePath));
        if (!relativePath || relativePath.startsWith('..')) {
          continue;
        }

        const modelFile = await createModelFile(
          filePath,
          relativePath,
          `huggingface:${entry.name}:${snapshot.name}:${relativePath}`,
          snapshot.name
        );
        if (!modelFile) {
          continue;
        }

        const existing = logicalFiles.get(relativePath);
        if (!existing || new Date(modelFile.lastModified).getTime() >= new Date(existing.lastModified).getTime()) {
          logicalFiles.set(relativePath, modelFile);
        }
      }
    }

    if (logicalFiles.size === 0) {
      continue;
    }

    const files = sortFiles(Array.from(logicalFiles.values()));
    const totalSize = await getDirectoryStorageSize(repoRoot);
    const lastModified = files.reduce((latest, file) => {
      return Math.max(latest, new Date(file.lastModified).getTime());
    }, 0);

    groups.push({
      id: `huggingface:${entry.name}`,
      repo,
      subtitle: snapshotCount > 1 ? `${snapshotCount} snapshots` : undefined,
      files,
      totalSize,
      sizeFormatted: formatBytes(totalSize),
      source: 'huggingface',
      type: resolveGroupType(files),
      lastModified: new Date(lastModified || Date.now()).toISOString(),
      fileListTooltip: files.map((file) => file.name).join(', '),
      deletePaths: [repoRoot],
    });
  }

  return groups.sort((left, right) => right.totalSize - left.totalSize);
}

async function readJsonSafe<T>(filePath: string): Promise<T | undefined> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return undefined;
  }
}

async function scanLlamaCache(dirPath: string): Promise<ModelGroup[]> {
  const groups = new Map<string, GroupAccumulator>();
  const entries = (await readDirectorySafe(dirPath)).filter((entry) => entry.isFile() || entry.isSymbolicLink());
  const existingNames = new Set(entries.map((entry) => entry.name));
  const consumedPaths = new Set<string>();
  const metadataByGgufName = new Map<string, { path: string; repo?: string }>();

  for (const entry of entries) {
    if (!entry.name.endsWith('.gguf.json')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const metadata = await readJsonSafe<{ url?: string }>(fullPath);
    const ggufName = entry.name.slice(0, -'.json'.length);

    metadataByGgufName.set(ggufName, {
      path: fullPath,
      repo: parseRepoFromUrl(metadata?.url) ?? parseLlamaRepoFromFileName(ggufName),
    });
  }

  for (const entry of entries) {
    if (!entry.name.endsWith('.gguf')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const metadataInfo = metadataByGgufName.get(entry.name);
    const repo = metadataInfo?.repo ?? parseLlamaRepoFromFileName(entry.name) ?? entry.name;
    const group = ensureGroup(groups, repo, repo, 'llamacpp');

    addFileToGroup(group, await createModelFile(fullPath, entry.name, `llamacpp:${entry.name}`));
    addDeletePath(group, fullPath);
    consumedPaths.add(path.resolve(fullPath));

    if (metadataInfo) {
      addFileToGroup(
        group,
        await createModelFile(
          metadataInfo.path,
          path.basename(metadataInfo.path),
          `llamacpp:${path.basename(metadataInfo.path)}`
        )
      );
      addDeletePath(group, metadataInfo.path);
      consumedPaths.add(path.resolve(metadataInfo.path));
    }

    const etagName = `${entry.name}.etag`;
    if (existingNames.has(etagName)) {
      const etagPath = path.join(dirPath, etagName);
      addFileToGroup(group, await createModelFile(etagPath, etagName, `llamacpp:${etagName}`));
      addDeletePath(group, etagPath);
      consumedPaths.add(path.resolve(etagPath));
    }
  }

  for (const entry of entries) {
    if (!entry.name.startsWith('manifest=') || !entry.name.endsWith('.json')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const { repo, variant } = parseLlamaManifestInfo(entry.name);
    const groupKey = repo ?? entry.name;
    const group = ensureGroup(groups, groupKey, repo ?? entry.name, 'llamacpp');

    if (variant) {
      group.subtitles.add(variant);
    }

    addFileToGroup(group, await createModelFile(fullPath, entry.name, `llamacpp:${entry.name}`));
    addDeletePath(group, fullPath);
    consumedPaths.add(path.resolve(fullPath));
  }

  for (const entry of entries) {
    if (!entry.name.endsWith('.gguf.json')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (consumedPaths.has(path.resolve(fullPath))) {
      continue;
    }

    const ggufName = entry.name.slice(0, -'.json'.length);
    const repo = metadataByGgufName.get(ggufName)?.repo ?? parseLlamaRepoFromFileName(ggufName) ?? ggufName;
    const group = ensureGroup(groups, repo, repo, 'llamacpp');

    addFileToGroup(group, await createModelFile(fullPath, entry.name, `llamacpp:${entry.name}`));
    addDeletePath(group, fullPath);
  }

  for (const entry of entries) {
    if (!entry.name.endsWith('.gguf.etag')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (consumedPaths.has(path.resolve(fullPath))) {
      continue;
    }

    const ggufName = entry.name.slice(0, -'.etag'.length);
    const repo = metadataByGgufName.get(ggufName)?.repo ?? parseLlamaRepoFromFileName(ggufName) ?? ggufName;
    const group = ensureGroup(groups, repo, repo, 'llamacpp');

    addFileToGroup(group, await createModelFile(fullPath, entry.name, `llamacpp:${entry.name}`));
    addDeletePath(group, fullPath);
  }

  return Array.from(groups.values())
    .map((group) => buildGroup(group))
    .filter((group): group is ModelGroup => Boolean(group))
    .sort((left, right) => right.totalSize - left.totalSize);
}

export async function scanAllModels(): Promise<ModelGroup[]> {
  const hfGroups = await scanHuggingFaceCache(HF_CACHE_DIR);
  const llamaGroups = await scanLlamaCache(LLAMA_CACHE_DIR);

  return [...hfGroups, ...llamaGroups].sort((left, right) => right.totalSize - left.totalSize);
}

function isPathInside(parentPath: string, targetPath: string): boolean {
  const relativePath = path.relative(parentPath, targetPath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function getDeleteTargets(group: ModelGroup): string[] {
  if (group.deletePaths?.length) {
    return group.deletePaths;
  }

  if (group.source === 'huggingface') {
    const repoRoots = new Set<string>();

    for (const file of group.files) {
      const snapshotMarker = `${path.sep}snapshots${path.sep}`;
      const markerIndex = file.path.indexOf(snapshotMarker);
      if (markerIndex === -1) {
        continue;
      }

      repoRoots.add(file.path.slice(0, markerIndex));
    }

    return Array.from(repoRoots);
  }

  const targets = new Set<string>();
  for (const file of group.files) {
    targets.add(file.path);
    if (file.path.endsWith('.gguf')) {
      targets.add(`${file.path}.json`);
      targets.add(`${file.path}.etag`);
    }
  }

  return Array.from(targets);
}

async function removeDeleteTarget(targetPath: string): Promise<void> {
  const stats = await lstatSafe(targetPath);
  if (!stats) {
    return;
  }

  if (stats.isDirectory()) {
    await fs.promises.rm(targetPath, { recursive: true, force: true });
    return;
  }

  await fs.promises.unlink(targetPath);
}

export async function deleteModelGroup(group: ModelGroup): Promise<boolean> {
  try {
    const deleteTargets = Array.from(
      new Set(getDeleteTargets(group).map((targetPath) => path.resolve(targetPath)))
    )
      .filter((targetPath) => {
        return isPathInside(HF_CACHE_DIR, targetPath) || isPathInside(LLAMA_CACHE_DIR, targetPath);
      })
      .sort((left, right) => right.length - left.length);

    for (const targetPath of deleteTargets) {
      if (targetPath === HF_CACHE_DIR || targetPath === LLAMA_CACHE_DIR) {
        continue;
      }

      await removeDeleteTarget(targetPath);
    }

    return true;
  } catch (e) {
    console.error('Failed to delete model group:', e);
    return false;
  }
}
