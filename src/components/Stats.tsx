import { motion } from 'framer-motion';

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

export function Stats({ totalModels, totalSize, hfCount, llamaCount }: StatsProps) {
  const items = [
    { 
      label: 'Total Models', 
      value: totalModels.toString(), 
      color: 'from-indigo-500 to-purple-500',
      icon: '📦'
    },
    { 
      label: 'Total Size', 
      value: formatBytes(totalSize), 
      color: 'from-purple-500 to-pink-500',
      icon: '💾'
    },
    { 
      label: 'Hugging Face', 
      value: hfCount.toString(), 
      color: 'from-yellow-500 to-orange-500',
      icon: '🤗'
    },
    { 
      label: 'Llama.cpp', 
      value: llamaCount.toString(), 
      color: 'from-green-500 to-emerald-500',
      icon: '🦙'
    },
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
    >
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          variants={itemVariants}
          whileHover={{ 
            y: -4, 
            transition: { type: 'spring', stiffness: 400, damping: 17 }
          }}
          className="group relative"
        >
          {/* Glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
          
          <div className="relative glass rounded-2xl p-5 border border-white/5 overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{item.icon}</span>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</p>
              </div>
              <p className={`text-2xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                {item.value}
              </p>
            </div>
            
            {/* Decorative corner */}
            <div className={`absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br ${item.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
