import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModelGroup } from './types';
import { ModelCard } from './components/ModelCard';
import { Header } from './components/Header';
import { Stats } from './components/Stats';
import { ParticleBackground } from './components/ParticleBackground';

function App() {
  const [models, setModels] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'huggingface' | 'llamacpp'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.scanModels();
        setModels(data);
      } else {
        setError('Electron API not available');
      }
    } catch (err) {
      setError('Failed to load models');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleDelete = async (model: ModelGroup) => {
    if (!window.electronAPI) return;
    
    const fileCount = model.files.length;
    const confirmed = confirm(
      `Are you sure you want to delete "${model.repo}"?\n\n` +
      `This will delete ${fileCount} file${fileCount > 1 ? 's' : ''} ` +
      `(${model.sizeFormatted}).`
    );
    if (!confirmed) return;

    const success = await window.electronAPI.deleteModel(model);
    if (success) {
      setModels(prev => prev.filter(m => m.id !== model.id));
    } else {
      alert('Failed to delete model');
    }
  };

  const filteredModels = models.filter(model => {
    const matchesFilter = filter === 'all' || model.source === filter;
    const matchesSearch = searchQuery === '' || 
      model.repo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalSize = models.reduce((acc, m) => acc + m.totalSize, 0);
  const hfModels = models.filter(m => m.source === 'huggingface');
  const llamaModels = models.filter(m => m.source === 'llamacpp');

  return (
    <div className="min-h-screen bg-gradient-animated text-gray-200 relative">
      {/* Particle background */}
      <ParticleBackground />
      
      {/* Decorative orbs */}
      <div className="fixed top-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl breathe pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl breathe pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl breathe pointer-events-none" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10">
        <Header 
          onRefresh={loadModels}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Stats 
            totalModels={models.length}
            totalSize={totalSize}
            hfCount={hfModels.length}
            llamaCount={llamaModels.length}
          />

          {/* Filter tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2 mb-8"
          >
            {(['all', 'huggingface', 'llamacpp'] as const).map((f, i) => (
              <motion.button
                key={f}
                onClick={() => setFilter(f)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  filter === f
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {filter === f && (
                  <motion.div
                    layoutId="activeFilter"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {f === 'all' ? 'All Models' : f === 'huggingface' ? 'Hugging Face' : 'Llama.cpp'}
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    filter === f ? 'bg-white/20' : 'bg-white/5'
                  }`}>
                    {f === 'all' ? models.length : f === 'huggingface' ? hfModels.length : llamaModels.length}
                  </span>
                </span>
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 gap-4"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
                <p className="text-sm text-gray-500">Scanning models...</p>
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-red-400 mb-4">{error}</p>
                <motion.button
                  onClick={loadModels}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors"
                >
                  Retry
                </motion.button>
              </motion.div>
            ) : filteredModels.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-lg text-gray-400 mb-2">No models found</p>
                <p className="text-sm text-gray-600 max-w-md mx-auto">
                  {models.length === 0 
                    ? 'No models found in ~/.cache/huggingface/hub or ~/Library/Caches/llama.cpp'
                    : 'No models match your current filters'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {filteredModels.map((model, index) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onDelete={handleDelete}
                    index={index}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        
        {/* Footer */}
        <footer className="py-8 text-center">
          <p className="text-xs text-gray-600">
            Models • Local AI Model Manager
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
