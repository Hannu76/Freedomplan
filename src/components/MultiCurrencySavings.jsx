import React, { useState, useEffect } from 'react';
import { AnimatedCounter } from './ui';

const CURRENCIES = [
  { code: 'GBP', flagCode: 'gb', label: 'UK', prefix: '£' },
  { code: 'INR', flagCode: 'in', label: 'India', prefix: '₹' },
  { code: 'PKR', flagCode: 'pk', label: 'Pakistan', prefix: 'Rs ' },
  { code: 'AFN', flagCode: 'af', label: 'Afghan', prefix: '؋ ' },
  { code: 'USD', flagCode: 'us', label: 'USA', prefix: '$' },
  { code: 'AUD', flagCode: 'au', label: 'Aus', prefix: 'A$' },
];

export default function MultiCurrencySavings({ targetGBP }) {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/GBP')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setRates(data.rates);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch exchange rates for MultiCurrencySavings', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full mt-6 mb-8 animate-slide-up animation-delay-200">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-bold text-[#667085] uppercase tracking-widest">
          Global Savings Power
        </h3>
        {loading && <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B6F36A] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B6F36A]"></span>
        </span>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CURRENCIES.map((currency) => {
          const rate = rates ? (rates[currency.code] || 1) : (currency.code === 'GBP' ? 1 : 0);
          const value = targetGBP * rate;

          return (
            <div 
              key={currency.code}
              className="relative isolate overflow-hidden rounded-2xl border border-[#EEF2F7] p-4 shadow-sm-clean transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
            >
              {/* 100% Opacity Flag Background mimicking EditableStatTile bgImage style */}
              <img 
                src={`https://flagcdn.com/w320/${currency.flagCode}.png`} 
                alt={`${currency.code} Flag`} 
                className="absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-700 group-hover:scale-105 opacity-100" 
              />
              {/* Exact white gradient overlay used in Expenses cards to make text readable without dulling the image entirely */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent w-full z-10" />
              
              <div className="relative z-20 flex flex-col justify-between h-full double-invert">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-black transition-colors">
                    {currency.label} — {currency.code}
                  </p>
                </div>

                <div className="flex items-center gap-1 transition-all duration-200">
                  <p className="figure text-xl sm:text-2xl font-extrabold tracking-tight text-black transition-colors">
                    {!loading ? (
                      <AnimatedCounter prefix={currency.prefix} value={Math.round(value)} />
                    ) : (
                      <span className="opacity-50 text-xl">...</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
