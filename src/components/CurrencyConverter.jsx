import React, { useState, useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, CURRENCY } from '../config'
import { IMAGES } from '../utils/images'
import { 
  TrendingUp, 
  ArrowRight, 
  Sparkles, 
  Globe, 
  Activity, 
  AlertCircle, 
  Check,
  RefreshCw,
  ChevronDown
} from 'lucide-react'

export default function CurrencyConverter() {
  const { rate, effectiveRates } = useStore()
  const [gbpInput, setGbpInput] = useState(PLAN.yearlyTarget || 5469)
  const [activeTimeframe, setActiveTimeframe] = useState('7D') // '24H' | '7D' | '30D'
  const [preferredCurrency, setPreferredCurrency] = useState(() => {
    try {
      return localStorage.getItem('freedomplan_preferred_currency') || null
    } catch (e) {
      return null
    }
  })

  const handleSelectCountry = (currencyCode) => {
    setPreferredCurrency(currencyCode)
    try {
      if (currencyCode) {
        localStorage.setItem('freedomplan_preferred_currency', currencyCode)
      } else {
        localStorage.removeItem('freedomplan_preferred_currency')
      }
    } catch (e) {}
  }

  const inrValue = gbpInput * rate
  const belowThreshold = rate < CURRENCY.lowRateWarningThreshold

  // Quick preset amounts
  const presets = [
    { label: '£1,000', value: 1000 },
    { label: '£2,500', value: 2500 },
    { label: '£5,000', value: 5000 },
    { label: '£5,469 (Yearly Plan)', value: 5469 },
    { label: '£10,000', value: 10000 },
  ]

  // Dynamic SVG Trendline points based on live rate anchor and selected timeframe
  const chartData = useMemo(() => {
    const pointsCount = activeTimeframe === '24H' ? 12 : activeTimeframe === '7D' ? 14 : 20
    const variance = activeTimeframe === '24H' ? 0.35 : activeTimeframe === '7D' ? 0.85 : 1.65
    
    // Seed pseudo-natural forex wave anchored ending exactly at current rate
    const points = []
    for (let i = 0; i < pointsCount; i++) {
      const progress = i / (pointsCount - 1)
      const wave = Math.sin(progress * Math.PI * 2.5 + (activeTimeframe === '30D' ? 1 : 0.5)) * variance
      const damp = Math.sin(progress * Math.PI)
      const offset = (wave * damp) - (variance * 0.15 * (1 - progress))
      // Last point is exact current rate
      const ptRate = i === pointsCount - 1 ? rate : rate + offset
      points.push(ptRate)
    }

    const min = Math.min(...points) - 0.2
    const max = Math.max(...points) + 0.2
    const range = max - min || 1

    const width = 280
    const height = 64
    const paddingY = 8

    const coords = points.map((p, idx) => {
      const x = (idx / (pointsCount - 1)) * width
      const y = height - paddingY - (((p - min) / range) * (height - paddingY * 2))
      return { x, y, val: p }
    })

    const pathD = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`
    }, '')

    const areaD = `${pathD} L ${width},${height} L 0,${height} Z`

    return {
      coords,
      pathD,
      areaD,
      width,
      height,
      minRate: min.toFixed(2),
      maxRate: max.toFixed(2),
      lastPoint: coords[coords.length - 1],
    }
  }, [rate, activeTimeframe])

  const ALL_CURRENCIES = useMemo(() => [
    { code: 'USD', flagCode: 'us', label: 'USA', name: 'US Dollar', country: 'United States', symbol: '$', spark: 'M0,15 Q30,5 60,18 T120,8' },
    { code: 'INR', flagCode: 'in', label: 'INDIA', name: 'Indian Rupee', country: 'India', symbol: '₹', spark: 'M0,18 Q30,12 60,6 T120,4' },
    { code: 'AUD', flagCode: 'au', label: 'AUSTRALIA', name: 'Australian Dollar', country: 'Australia', symbol: 'A$', spark: 'M0,10 Q30,20 60,10 T120,12' },
    { code: 'PKR', flagCode: 'pk', label: 'PAKISTAN', name: 'Pakistani Rupee', country: 'Pakistan', symbol: 'Rs ', spark: 'M0,14 Q30,8 60,15 T120,6' },
    { code: 'AFN', flagCode: 'af', label: 'AFGHANISTAN', name: 'Afghan Afghani', country: 'Afghanistan', symbol: '؋ ', spark: 'M0,12 Q30,16 60,8 T120,10' },
    { code: 'GBP', flagCode: 'gb', label: 'UK', name: 'British Pound', country: 'United Kingdom', symbol: '£', spark: 'M0,10 Q30,10 60,10 T120,10' },
  ], [])

  const displayCurrencies = useMemo(() => {
    if (!preferredCurrency) {
      return ALL_CURRENCIES.filter(c => c.code !== 'GBP').slice(0, 5)
    }
    const selected = ALL_CURRENCIES.find(c => c.code === preferredCurrency)
    if (!selected) {
      return ALL_CURRENCIES.filter(c => c.code !== 'GBP').slice(0, 5)
    }
    const others = ALL_CURRENCIES.filter(c => c.code !== selected.code && (selected.code === 'GBP' || c.code !== 'GBP'))
    return [selected, ...others].slice(0, 5)
  }, [preferredCurrency, ALL_CURRENCIES])

  return (
    <div className="space-y-8 animate-slide-up max-w-[1240px] mx-auto pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP FINANCIAL KPI CARDS (Savings-Style Financial Objects)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        
        {/* Card 1: Conversion Equivalent with Direct Image Visibility (No White Masking Box) */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-neutral-950 border border-neutral-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[200px] sm:min-h-[220px]">
          {/* Background Image: Uploaded Hands Exchanging GBP £20 & INR ₹500 (No blur, 100% visible) */}
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <img
              src={IMAGES.conversion_equivalent}
              alt="Conversion Equivalent"
              className="w-full h-full object-cover object-center"
              style={{ opacity: 1, filter: 'none' }}
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  Conversion Equivalent
                </p>
                <h3 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 figure drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  ₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <p className="text-xs font-black text-white/90 mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  For <span className="text-emerald-300 font-black figure">£{gbpInput.toLocaleString('en-GB')}</span> input amount
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 text-emerald-400 text-[11px] font-black border border-emerald-500/40 shadow-lg shrink-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Converted
              </span>
            </div>
          </div>

          {/* Subtle Currency Flow Visualization */}
          <div className="mt-4 relative z-10">
            <div className="rounded-xl bg-neutral-900/90 border border-neutral-700 p-2 sm:p-2.5 flex items-center justify-between text-xs font-extrabold gap-2 shadow-xl">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-white text-[#0F172A] text-[10px] uppercase font-black shadow-xs">GBP</span>
                <span className="text-white figure font-black">£{gbpInput.toLocaleString('en-GB')}</span>
              </div>
              
              <div className="flex items-center gap-1 text-slate-300 text-[10px] font-black bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700 shadow-2xs shrink-0">
                <span>⇄ FX: ₹{rate.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] uppercase font-black shadow-xs">INR</span>
                <span className="text-emerald-400 figure font-black">₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: FreedomPlan Forex Rate with Full Cash Image (No heavy padding, full clear fit) */}
        <div className="relative isolate overflow-hidden rounded-[24px] bg-white border border-[#E2E8F0] p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[200px] sm:min-h-[220px]">
          {/* Background Image: Full Card Width Spanning Banknotes & Exchange Ring (Zero Blur, Zero Cutoff) */}
          <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <img
              src={IMAGES.forex_gbp_inr}
              alt="FreedomPlan Forex Rate Cash"
              className="w-full h-full object-cover object-[right_center]"
              style={{ opacity: 1, filter: 'none' }}
            />
          </div>

          {/* Left Column: Compact Text Layout with Minimal Padding */}
          <div className="relative z-10 max-w-[46%] sm:max-w-[44%] flex flex-col justify-between h-full space-y-3">
            <div>
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#0F172A]">
                FreedomPlan Forex Rate
              </p>
              <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-700 tracking-tight mt-0.5 figure">
                ₹{(rate + 2).toFixed(2)} <span className="text-sm sm:text-base font-bold text-[#64748B]">/ £</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#334155] mt-0.5 font-extrabold whitespace-nowrap">
                Live rate: <span className="font-black text-[#0F172A] figure">₹{rate.toFixed(2)}</span> + <span className="text-[#64748B]">₹2 fee</span>
              </p>
            </div>

            {/* Timeframe Tabs & Live Anchor */}
            <div className="space-y-1.5 pt-0.5">
              <div className="inline-flex items-center bg-white/95 p-0.5 rounded-lg border border-[#CBD5E1] text-[10px] font-extrabold shadow-2xs">
                {['24H', '7D', '30D'].map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setActiveTimeframe(tf)}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      activeTimeframe === tf 
                        ? 'bg-[#0F172A] text-white shadow-xs' 
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-extrabold whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Direct Live Anchor
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* ─────────────────────────────────────────────────────────────
          2. DEDICATED CENTERED HERO RESULT PANEL (Section 4 & 11)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative isolate overflow-hidden rounded-[26px] bg-neutral-950 border border-neutral-800 p-7 sm:p-10 shadow-sm text-center flex flex-col items-center justify-center space-y-3 min-h-[160px] group transition-all duration-350">
        {/* Background Image: Reusing exact IMAGES.save asset from Net Monthly Surplus Buffer (No blur, 90% visible) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <img
            src={IMAGES.save}
            alt="Net Remittance Equivalent"
            className="w-full h-full object-cover object-[center_30%]"
            style={{ opacity: 0.9, filter: 'none', mixBlendMode: 'normal' }}
          />
        </div>

        {/* Center High-Contrast Content */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-black tracking-widest uppercase border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Net Remittance Equivalent
          </div>

          <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white figure tracking-tight">
            £{gbpInput.toLocaleString('en-GB')} = ₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 font-bold">
            at ₹{rate.toFixed(2)} / £ (Market Rate Anchor)
          </p>
        </div>
      </div>


      {/* ─────────────────────────────────────────────────────────────
          3. CALCULATOR / INTERACTIVE TRANSFER CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-[26px] bg-white border border-[#E2E8F0] p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="font-display text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
            Remittance Planner & Transfer Simulator
          </h3>
          <p className="text-xs text-[#64748B] mt-1 font-medium">
            Test custom GBP transfer amounts to project live converted INR yields and optimize FX conversion timing.
          </p>
        </div>

        {/* Preset Chips */}
        <div className="space-y-2">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
            Quick Transfer Amounts
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => {
              const isSelected = gbpInput === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setGbpInput(p.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F172A] text-white shadow-sm ring-2 ring-[#0F172A]/20'
                      : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Input Dual Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Custom GBP Input */}
          <div className="space-y-1.5">
            <label htmlFor="gbp-transfer-amount" className="text-xs font-black text-[#0F172A]">
              Custom GBP Transfer Amount (£)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-black text-[#64748B] figure">£</span>
              <input
                id="gbp-transfer-amount"
                type="number"
                min="1"
                step="50"
                value={gbpInput}
                onChange={(e) => setGbpInput(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-[14px] border border-[#CBD5E1] bg-white pl-8 pr-4 py-3 text-base font-black text-[#0F172A] figure focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] focus:outline-none transition-all shadow-xs"
                placeholder="Enter amount in GBP..."
              />
            </div>
          </div>

          {/* Locked Real-Time FX Anchor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="rate-input" className="text-xs font-black text-[#0F172A]">
                Live Market Exchange Anchor
              </label>
              <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md shadow-xs">
                Auto-Synced Live
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-black text-[#0F172A] figure">₹</span>
              <input
                id="rate-input"
                type="number"
                readOnly
                value={rate}
                className="w-full rounded-[14px] border border-[#CBD5E1] bg-[#F8FAFC] pl-8 pr-4 py-3 text-base font-black text-[#64748B] figure cursor-not-allowed shadow-xs"
                title="Live synced from ExchangeRate-API"
              />
            </div>
          </div>

        </div>

        {/* Low Rate Warning Alert */}
        {belowThreshold && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 flex items-center gap-3 text-xs font-bold text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Alert: Exchange anchor has dropped below ₹{CURRENCY.lowRateWarningThreshold}. Your transfers currently yield fewer INR than projected in baseline goals.
            </span>
          </div>
        )}

      </div>


      {/* ─────────────────────────────────────────────────────────────
          4. MULTI-CURRENCY EQUIVALENTS (With 6th "Customize Your Country" Slot)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative isolate overflow-hidden rounded-[26px] bg-white border border-[#E2E8F0] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0F172A]" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#64748B]">
              Global Reach
            </span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
            Multi-Currency Equivalents
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5 font-medium">
            See exactly what your £{gbpInput.toLocaleString('en-GB')} translates to across global markets using today's live exchange rates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCurrencies.map((currency) => {
            const currencyRate = currency.code === 'GBP' ? 1 : (effectiveRates && effectiveRates[currency.code] ? effectiveRates[currency.code] : 0)
            const convertedValue = gbpInput * currencyRate
            const isPreferred = preferredCurrency === currency.code

            return (
              <div 
                key={currency.code} 
                className="relative isolate overflow-hidden rounded-[22px] border border-white/20 p-5 shadow-sm hover:shadow-md hover:border-white/40 transition-all duration-300 flex flex-col justify-between space-y-4 group min-h-[175px] bg-neutral-900"
              >
                {/* Full-width clean authentic country flag */}
                <img 
                  src={`https://flagcdn.com/w320/${currency.flagCode}.png`} 
                  alt={`${currency.name} Flag`} 
                  className="absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-700 group-hover:scale-105" 
                  style={{ opacity: 1, filter: 'none' }} 
                  loading="lazy"
                />

                {/* Card Header in Liquid Glass Transparency */}
                <div className="relative z-20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white bg-black/45 backdrop-blur-md px-3 py-1 rounded-xl border border-white/25 shadow-md drop-shadow-sm">
                      {currency.label} — {currency.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isPreferred && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-200 bg-amber-950/75 backdrop-blur-md border border-amber-400/40 px-2.5 py-1 rounded-full shadow-md">
                        ★ Your Country
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 bg-emerald-950/75 backdrop-blur-md border border-emerald-400/40 px-2.5 py-1 rounded-full shadow-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </span>
                  </div>
                </div>

                {/* Card Amounts in Liquid Glass Transparency with Pure White Text & Numbers */}
                <div className="relative z-20 bg-black/45 backdrop-blur-md p-3.5 rounded-2xl border border-white/25 shadow-lg space-y-0.5">
                  <h4 className="font-display text-2xl sm:text-3xl font-black text-white figure tracking-tight drop-shadow-md">
                    {currencyRate > 0 ? `${currency.symbol}${convertedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Syncing...'}
                  </h4>
                  <p className="text-xs font-bold text-white/90 figure drop-shadow-sm">
                    Rate: <span className="font-black text-white">{currencyRate > 0 ? currencyRate.toFixed(4) : '—'}</span>
                  </p>
                </div>
              </div>
            )
          })}

          {/* Card 6: Permanent "Customize Your Country" Selector Card (Crisp Vintage Styling, Zero Blur) */}
          <div className="relative isolate overflow-hidden rounded-[22px] border border-[#CBD5E1] hover:border-slate-400 bg-[#1C1917] p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4 group min-h-[175px]">
            {/* Full-width custom country background with vintage warmth */}
            <img 
              src={IMAGES.custom_country_bg} 
              alt="Customize Your Country Background" 
              className="absolute inset-0 w-full h-full object-cover object-center z-0 transition-transform duration-700 group-hover:scale-105" 
              style={{ 
                filter: 'sepia(0.2) contrast(1.1) saturate(0.9) brightness(0.95)',
                opacity: 1
              }} 
              loading="lazy"
            />
            
            {/* Vintage dark vignette overlay (zero blur) */}
            <div 
              className="absolute inset-0 z-10 pointer-events-none" 
              style={{ 
                background: 'radial-gradient(circle at 50% 40%, rgba(20,15,10,0.4) 0%, rgba(10,8,5,0.75) 75%, rgba(5,4,2,0.9) 100%)',
                mixBlendMode: 'multiply'
              }} 
            />

            <div className="relative z-20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 drop-shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Customize Your Country
                </span>
                {preferredCurrency && (
                  <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
                    Active: {preferredCurrency}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-100 font-bold drop-shadow-sm">
                Choose your country
              </p>
            </div>

            <div className="relative z-20 space-y-2">
              {/* Searchable / Styled Select Box with Country Flags (No blur) */}
              <div className="relative">
                <select
                  id="customize-country-select"
                  aria-label="Customize Your Country"
                  value={preferredCurrency || ''}
                  onChange={(e) => handleSelectCountry(e.target.value)}
                  className="w-full rounded-xl border border-amber-200/40 bg-neutral-900/95 px-3 py-2.5 text-xs font-black text-white focus:border-amber-400 focus:outline-none shadow-lg appearance-none cursor-pointer pr-8"
                >
                  <option value="" disabled className="text-neutral-400 bg-neutral-900">Select your country...</option>
                  <option value="INR" className="text-white bg-neutral-900">🇮🇳 India · INR</option>
                  <option value="USD" className="text-white bg-neutral-900">🇺🇸 United States · USD</option>
                  <option value="PKR" className="text-white bg-neutral-900">🇵🇰 Pakistan · PKR</option>
                  <option value="AUD" className="text-white bg-neutral-900">🇦🇺 Australia · AUD</option>
                  <option value="AFN" className="text-white bg-neutral-900">🇦🇫 Afghanistan · AFN</option>
                  <option value="GBP" className="text-white bg-neutral-900">🇬🇧 United Kingdom · GBP</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-amber-200">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              <p className="text-[10px] font-extrabold text-amber-100/90 drop-shadow-sm leading-tight">
                Your currency will appear first in your Multi-Currency section.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
