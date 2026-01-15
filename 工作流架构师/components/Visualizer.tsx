import React from 'react';

interface VisualizerProps {
  active: boolean;
  volume: number; // 0 to 1
}

export const Visualizer: React.FC<VisualizerProps> = ({ active, volume }) => {
  // Create 5 bars
  const bars = Array.from({ length: 5 });

  return (
    <div className="flex items-center justify-center gap-1 h-12 w-16">
      {bars.map((_, i) => {
        // Calculate dynamic height based on volume and index to create a wave
        // If not active, show small static bars
        const baseHeight = active ? 20 : 4;
        const variableHeight = active ? volume * 40 : 0; 
        // Add some randomness/offset for each bar
        const height = Math.min(100, Math.max(4, baseHeight + variableHeight * (Math.random() * 0.5 + 0.5)));
        
        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-100 ${
              active ? 'bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-gray-600'
            }`}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
};