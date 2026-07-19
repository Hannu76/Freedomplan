import React from 'react';
import { useStore } from '../context/StoreContext';

export default function CurrencyWidget({ darkMode }) {
  const { rate } = useStore();

  return (
    <div className={`w-full h-full min-h-[120px] flex flex-col justify-center p-6 rounded-[20px] transition-colors duration-300 ${darkMode ? 'bg-neutral-900 border border-neutral-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
            Live Exchange Rate
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold figure ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              £1 = ₹{rate.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Live</span>
        </div>
      </div>
    </div>
  );
}
