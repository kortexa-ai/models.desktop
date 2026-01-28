import { useState, useEffect, useCallback } from 'react';
import { ModelGroup } from './types';
import { ModelCard } from './components/ModelCard';
import { Header } from './components/Header';
import { Stats } from './components/Stats';

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
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <Header 
        onRefresh={loadModels}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Stats 
          totalModels={models.length}
          totalSize={totalSize}
          hfCount={hfModels.length}
          llamaCount={llamaModels.length}
        />

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'huggingface', 'llamacpp'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'All Models' : f === 'huggingface' ? 'Hugging Face' : 'Llama.cpp'}
              <span className="ml-2 text-xs opacity-70">
                {f === 'all' ? models.length : f === 'huggingface' ? hfModels.length : llamaModels.length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadModels}
              className="px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No models found</p>
            <p className="text-sm mt-2">
              {models.length === 0 
                ? 'No models found in ~/.cache/huggingface/hub or ~/Library/Caches/llama.cpp'
                : 'No models match your filters'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredModels.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
