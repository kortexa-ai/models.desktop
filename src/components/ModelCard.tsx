import { useState } from 'react';
import { ModelGroup } from '../types';

interface ModelCardProps {
  model: ModelGroup;
  onDelete: (model: ModelGroup) => void;
}

const typeColors: Record<string, string> = {
  gguf: 'bg-green-500/20 text-green-400 border-green-500/30',
  safetensors: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  pytorch: 'bg-red-500/20 text-red-400 border-red-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  mixed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const sourceIcons: Record<string, string> = {
  huggingface: '🤗',
  llamacpp: '🦙',
};

export function ModelCard({ model, onDelete }: ModelCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const fileCount = model.files.length;
  const isGroup = fileCount > 1;

  return (
    <div className="group bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 hover:bg-gray-900 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" title={model.source}>
            {sourceIcons[model.source]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[model.type]}`}>
            {model.type}
          </span>
        </div>
        <button
          onClick={() => onDelete(model)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          title={`Delete ${fileCount} file${fileCount > 1 ? 's' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Primary: Repo name */}
      <h3 className="font-medium text-gray-200 mb-1 truncate" title={model.repo}>
        {model.repo}
      </h3>

      {/* Secondary: File count or single filename */}
      <div className="relative">
        {isGroup ? (
          <button
            className="text-xs text-gray-500 hover:text-gray-400 cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {fileCount} files
          </button>
        ) : (
          <p className="text-xs text-gray-500 truncate" title={model.files[0]?.name}>
            {model.files[0]?.name}
          </p>
        )}

        {/* Tooltip for file list */}
        {showTooltip && model.fileListTooltip && (
          <div className="absolute z-10 left-0 mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-w-xs">
            <p className="text-xs text-gray-300 whitespace-pre-wrap">
              {model.fileListTooltip}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-800">
        <span className="font-medium text-gray-400">{model.sizeFormatted}</span>
        <span>{new Date(model.lastModified).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
