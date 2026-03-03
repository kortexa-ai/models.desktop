import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelGroup } from '../types';

interface ModelCardV2Props {
  model: ModelGroup;
  onDelete: (model: ModelGroup) => void;
  index: number;
}

const sourceIcons: Record<string, string> = {
  huggingface: '🤗',
  llamacpp: '🦙',
};

export function ModelCardV2({ model, onDelete, index }: ModelCardV2Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const fileCount = model.files.length;
  const isGroup = fileCount > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={showTooltip ? 'relative z-30' : 'relative z-0'}
    >
      {/* Card with glass morphism */}
      <div 
        className="relative rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          {/* Inner gradient overlay */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)',
            }}
          />
        </div>
        
        <div className="relative p-5">
          {/* Header row: Icon + Delete button */}
          <div className="flex items-start justify-between mb-4">
            {/* Icon with gradient background */}
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(6, 182, 212, 0.3) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
              }}
            >
              {sourceIcons[model.source]}
            </div>
            
            {/* Delete button */}
            <motion.button
              onClick={() => onDelete(model)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
              title={`Delete ${fileCount} file${fileCount > 1 ? 's' : ''}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          {/* Content */}
          <div className="mb-4">
            {/* Title */}
            <h3 
              className="text-lg font-semibold mb-1 line-clamp-2"
              style={{ color: 'rgba(255, 255, 255, 0.95)' }}
              title={model.repo}
            >
              {model.repo}
            </h3>

            {model.subtitle && (
              <p
                className="text-xs mb-2 truncate"
                style={{ color: 'rgba(255, 255, 255, 0.45)' }}
                title={model.subtitle}
              >
                {model.subtitle}
              </p>
            )}

            {/* Subtitle / File count */}
            <div
              className="relative inline-flex flex-col items-start"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {isGroup ? (
                <button
                  className="text-sm flex items-center gap-1.5 transition-colors hover:text-indigo-400"
                  style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                >
                  <span 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                    }}
                  />
                  {fileCount} files
                </button>
              ) : (
                <p 
                  className="text-sm truncate font-mono"
                  style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                  title={model.files[0]?.name}
                >
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
                    className="absolute left-0 top-full z-50 mt-2 flex min-w-[14rem] max-w-sm flex-col overflow-hidden rounded-xl p-3"
                    style={{
                      background: 'rgba(20, 20, 30, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                      maxHeight: 'min(24rem, calc(100vh - 10rem))',
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      Files in this model:
                    </p>
                    <div
                      className="space-y-1 overflow-y-auto pr-1"
                      style={{ maxHeight: 'min(20rem, calc(100vh - 13rem))' }}
                    >
                      {model.files.map((file, i) => (
                        <div 
                          key={i} 
                          className="text-xs break-all leading-relaxed"
                          style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          {file.name}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer: Size + Date */}
          <div 
            className="flex items-center justify-between pt-4"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <span 
              className="text-sm font-medium"
              style={{ color: 'rgba(255, 255, 255, 0.9)' }}
            >
              {model.sizeFormatted}
            </span>
            <span 
              className="text-xs"
              style={{ color: 'rgba(255, 255, 255, 0.4)' }}
            >
              {new Date(model.lastModified).toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
