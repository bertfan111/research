import React from 'react';
import { AutomationCandidate } from '../types';

interface CandidateCardProps {
  candidate: AutomationCandidate;
}

const ComplexityMap = {
  'Low': '低',
  'Medium': '中',
  'High': '高'
};

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  return (
    <div className="bg-gray-850 border border-gray-700 rounded-xl p-5 mb-4 hover:border-brand-500 transition-colors duration-200 group">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg text-white group-hover:text-brand-500 transition-colors">
          {candidate.title}
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${
          candidate.complexity === 'High' ? 'bg-red-900/30 border-red-800 text-red-400' :
          candidate.complexity === 'Medium' ? 'bg-yellow-900/30 border-yellow-800 text-yellow-400' :
          'bg-green-900/30 border-green-800 text-green-400'
        }`}>
          {ComplexityMap[candidate.complexity] || candidate.complexity} 复杂度
        </span>
      </div>
      
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">
        {candidate.description}
      </p>

      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {candidate.estimatedTimeSaved}
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          {candidate.frequency}
        </div>
      </div>

      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">工作流步骤</h4>
        <ul className="space-y-1">
          {candidate.steps.map((step, idx) => (
            <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
              <span className="text-brand-600 mt-0.5">•</span>
              {step}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
        <button className="text-sm text-brand-500 hover:text-brand-400 font-medium">
          创建工作流定义 &rarr;
        </button>
      </div>
    </div>
  );
};