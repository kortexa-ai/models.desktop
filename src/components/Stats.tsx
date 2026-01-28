interface StatsProps {
  totalModels: number;
  totalSize: number;
  hfCount: number;
  llamaCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function Stats({ totalModels, totalSize, hfCount, llamaCount }: StatsProps) {
  const items = [
    { label: 'Total Models', value: totalModels.toString(), color: 'text-white' },
    { label: 'Total Size', value: formatBytes(totalSize), color: 'text-indigo-400' },
    { label: 'Hugging Face', value: hfCount.toString(), color: 'text-yellow-400' },
    { label: 'Llama.cpp', value: llamaCount.toString(), color: 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {items.map((item) => (
        <div key={item.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">{item.label}</p>
          <p className={`text-2xl font-semibold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
