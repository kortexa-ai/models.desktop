import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelGroup } from '../types';

interface ModelCardProps {
  model: ModelGroup;
  onDelete: (model: ModelGroup) => void;
  index: number;
}

const typeConfig: Record<string, { gradient: string; icon: string; label: string }> = {
  gguf: { 
    gradient: 'from-green-500/20 via-green-500/10 to-transparent', 
    icon: '🦙',
    label: 'GGUF'
  },
  safetensors: { 
    gradient: 'from-yellow-500/20 via-yellow-500/10 to-transparent', 
    icon: '🔒',
    label: 'Safe'
  },
  pytorch: { 
    gradient: 'from-red-500/20 via-red-500/10 to-transparent', 
    icon: '🔥',
    label: 'PyTorch'
  },
  other: { 
    gradient: 'from-gray-500/20 via-gray-500/10 to-transparent', 
    icon: '📄',
    label: 'Other'
  },
  mixed: { 
    gradient: 'from-indigo-500/20 via-purple-500/10 to-transparent', 
    icon: '📦',
    label: 'Mixed'
  },
};

const sourceIcons: Record<string, string> = {
  huggingface: '🤗',
  llamacpp: '🦙',
};

export function ModelCard({ model, onDelete, index }: ModelCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileCount = model.files.length;
  const isGroup = fileCount > 1;
  const config = typeConfig[model.type] || typeConfig.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={{ y: -6 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative"
    >
      {/* Animated border glow */}
      <motion.div
        className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-500"
        animate={isHovered ? { opacity: 0.3 } : { opacity: 0 }}
      />
      
      {/* Card */}
      <div className="relative glass rounded-2xl p-5 border border-white/5 overflow-hidden card-hover h-full flex flex-col">
        {/* Type gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-50`} />
        
        {/* Shimmer on hover */}
        <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {sourceIcons[model.source]}
              </motion.div>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 border border-white/5">
                {config.label}
              </span>
            </div>
            
            <motion.button
              onClick={() => onDelete(model)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
              title={`Delete ${fileCount} file${fileCount > 1 ? 's' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Repo name */}
            <h3 className="font-semibold text-gray-100 mb-2 line-clamp-2 leading-tight" title={model.repo}>
              {model.repo}
            </h3>

            {/* File count or single filename */}
            <div className="relative">
              {isGroup ? (
                <motion.button
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  whileHover={{ x: 2 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{fileCount} files</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.button>
              ) : (
                <p className="text-xs text-gray-600 truncate font-mono" title={model.files[0]?.name}>
                  {model.files[0]?.name}
                </p>
              )}

              {/* Tooltip */}
              <AnimatePresence>
                {showTooltip && model.fileListTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 left-0 mt-2 p-3 glass rounded-xl border border-white/10 shadow-2xl max-w-xs"
                  >
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Files in this model:</p>
                    <div className="space-y-1">
                      {model.files.map((file, i) => (
                        <div key={i} className="text-xs text-gray-300 truncate">
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
            <span className="text-sm font-semibold text-white">{model.sizeFormatted}</span>
            <span className="text-[10px] text-gray-600">
              {new Date(model.lastModified).toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      </div>
    </motion.div>
  );
}
