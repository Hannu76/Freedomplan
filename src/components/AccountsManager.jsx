import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import { Card, Modal, BANKNOTE_URL, BEFORE_URL, BLACK_TEXT_URL, MINT_TEXT_URL, WHITE_TEXT_URL, TRICOLOR_WHITE_URL } from './ui.jsx'
import {
  CreditCard,
  TrendingUp,
  Wallet,
  Landmark,
  Search,
  Plus,
  Pencil,
  Trash2,
  Pause,
  Play,
  CheckCircle2,
  Sparkles,
  Info,
  X,
  Percent
} from 'lucide-react'

// Special Theme for India Equity Index SIP (White Card with Red, Blue, and Black Guilloche Lines)
const TRICOLOR_WHITE_THEME = {
  id: 'tricolor-white',
  bgUrl: TRICOLOR_WHITE_URL,
  bgColor: 'bg-white',
  border: 'border-slate-300 shadow-md',
  glow: 'hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)]',
  title: 'text-[#161C2D]',
  sub: 'text-[#667085]',
  amount: 'text-[#161C2D]',
  badge: 'bg-white/90 text-[#161C2D] border-slate-300 shadow-2xs font-extrabold',
  innerBox: 'bg-[#F9FBFD]/95 border-slate-200/90 text-[#161C2D]',
  innerBoxSub: 'text-[#667085]',
  equivBadge: 'bg-white text-[#161C2D] border-slate-300 shadow-xs font-bold',
  trackBg: 'bg-slate-200/80',
  trackFill: 'bg-gradient-to-r from-[#B0102B] via-[#00439F] to-[#161C2D]',
  iconBox: 'bg-white border-slate-300 text-[#00439F] shadow-xs',
  actionBtn: 'bg-white hover:bg-slate-50 text-[#161C2D] border-slate-300 shadow-sm-clean',
  dangerBtn: 'text-rose-600 hover:text-rose-700 hover:bg-rose-100/60',
  accentLine: 'from-[#B0102B] via-[#00439F] to-[#161C2D]',
  isDark: false,
}

// Distinct luxury card visual styles alternating Red Titanium, Obsidian Black, Royal Blue, and Porcelain
const THEMES = [
  {
    // 0: Titanium Crimson Red (matching "How It Works" hero button)
    id: 'red',
    bgUrl: BEFORE_URL,
    bgColor: 'bg-[#B0102B]',
    border: 'border-red-900/60',
    glow: 'hover:shadow-[0_16px_40px_rgba(176,16,43,0.35)]',
    title: 'text-white',
    sub: 'text-red-100/85',
    amount: 'text-white',
    badge: 'bg-white/20 text-white border-white/30',
    innerBox: 'bg-black/30 border-white/15 text-white',
    innerBoxSub: 'text-red-100/75',
    equivBadge: 'bg-black/50 text-white border-white/20',
    trackBg: 'bg-black/40',
    trackFill: 'bg-gradient-to-r from-amber-300 via-yellow-200 to-[#00cc44]',
    iconBox: 'bg-white/20 border-white/30 text-white',
    actionBtn: 'bg-white/15 hover:bg-white/25 text-white border-white/20',
    dangerBtn: 'text-red-200 hover:text-white hover:bg-white/10',
    accentLine: 'from-transparent via-red-300 to-transparent',
    isDark: true,
  },
  {
    // 1: Obsidian Black (matching executive black texture)
    id: 'black',
    bgUrl: BLACK_TEXT_URL,
    bgColor: 'bg-[#12151B]',
    border: 'border-slate-800',
    glow: 'hover:shadow-[0_16px_40px_rgba(18,21,27,0.45)]',
    title: 'text-white',
    sub: 'text-slate-300/85',
    amount: 'text-white',
    badge: 'bg-white/15 text-white border-white/25',
    innerBox: 'bg-white/5 border-white/10 text-white',
    innerBoxSub: 'text-slate-400',
    equivBadge: 'bg-black/60 text-white border-white/15',
    trackBg: 'bg-white/15',
    trackFill: 'bg-[#00cc44]',
    iconBox: 'bg-white/10 border-white/20 text-[#00cc44]',
    actionBtn: 'bg-white/10 hover:bg-white/20 text-white border-white/15',
    dangerBtn: 'text-rose-300 hover:text-rose-200 hover:bg-white/10',
    accentLine: 'from-transparent via-slate-400 to-transparent',
    isDark: true,
  },
  {
    // 2: Royal Blue Banknote (matching "Start Free" / "Get Instant Access" hero button)
    id: 'blue',
    bgUrl: BANKNOTE_URL,
    bgColor: 'bg-[#00439F]',
    border: 'border-blue-900/60',
    glow: 'hover:shadow-[0_16px_40px_rgba(0,67,159,0.35)]',
    title: 'text-white',
    sub: 'text-blue-100/85',
    amount: 'text-white',
    badge: 'bg-white/20 text-white border-white/30',
    innerBox: 'bg-black/30 border-white/15 text-white',
    innerBoxSub: 'text-blue-100/75',
    equivBadge: 'bg-black/50 text-white border-white/20',
    trackBg: 'bg-black/40',
    trackFill: 'bg-gradient-to-r from-cyan-300 via-sky-200 to-[#00cc44]',
    iconBox: 'bg-white/20 border-white/30 text-white',
    actionBtn: 'bg-white/15 hover:bg-white/25 text-white border-white/20',
    dangerBtn: 'text-blue-200 hover:text-white hover:bg-white/10',
    accentLine: 'from-transparent via-blue-300 to-transparent',
    isDark: true,
  },
  {
    // 3: Obsidian Black with Gold / Amber Accent
    id: 'black-gold',
    bgUrl: BLACK_TEXT_URL,
    bgColor: 'bg-[#161B22]',
    border: 'border-slate-700/60',
    glow: 'hover:shadow-[0_16px_40px_rgba(22,27,34,0.45)]',
    title: 'text-white',
    sub: 'text-slate-300/85',
    amount: 'text-white',
    badge: 'bg-white/15 text-white border-white/25',
    innerBox: 'bg-white/5 border-white/10 text-white',
    innerBoxSub: 'text-slate-400',
    equivBadge: 'bg-black/60 text-white border-white/15',
    trackBg: 'bg-white/15',
    trackFill: 'bg-amber-400',
    iconBox: 'bg-white/10 border-white/20 text-amber-400',
    actionBtn: 'bg-white/10 hover:bg-white/20 text-white border-white/15',
    dangerBtn: 'text-rose-300 hover:text-rose-200 hover:bg-white/10',
    accentLine: 'from-transparent via-amber-300 to-transparent',
    isDark: true,
  },
]

export default function AccountsManager() {
  const { accounts, addAccount, updateAccount, deleteAccount, rate, derived } = useStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL' | 'EMI' | 'ASSET'
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [form, setForm] = useState({
    name: '',
    type: 'EMI',
    targetAmount: 5000,
    currency: 'INR',
    frequency: 'Monthly',
    status: 'Active',
    notes: '',
  })

  function openCreateModal(defaultType = 'EMI') {
    setEditingId(null)
    setForm({
      name: '',
      type: defaultType,
      targetAmount: defaultType === 'EMI' ? 5000 : 25000,
      currency: 'INR',
      frequency: 'Monthly',
      status: 'Active',
      notes: '',
    })
    setIsModalOpen(true)
  }

  function openEditModal(acc) {
    setEditingId(acc.id)
    setForm({
      name: acc.name,
      type: acc.type,
      targetAmount: acc.targetAmount,
      currency: acc.currency,
      frequency: acc.frequency,
      status: acc.status,
      notes: acc.notes || '',
    })
    setIsModalOpen(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.targetAmount) return

    const payload = {
      ...form,
      targetAmount: Number(form.targetAmount) || 0,
    }

    if (editingId) {
      updateAccount(editingId, payload)
    } else {
      addAccount(payload)
    }
    setIsModalOpen(false)
  }

  const emiAccounts = useMemo(() => accounts.filter((a) => a.type === 'EMI'), [accounts])
  const assetAccounts = useMemo(() => accounts.filter((a) => a.type === 'Asset'), [accounts])

  // Currency helpers
  const fmtCurrency = (amt, curr) => {
    const num = Number(amt) || 0
    return curr === 'INR'
      ? `₹${num.toLocaleString('en-IN')}`
      : `£${num.toLocaleString('en-GB')}`
  }

  const getReciprocalEquivalent = (amt, curr) => {
    const num = Number(amt) || 0
    const currentRate = Number(rate) || 108
    if (curr === 'INR') {
      const gbp = Math.round(num / currentRate)
      return { value: `£${gbp.toLocaleString('en-GB')}`, rateText: `₹${currentRate}/£` }
    } else {
      const inr = Math.round(num * currentRate)
      return { value: `₹${inr.toLocaleString('en-IN')}`, rateText: `₹${currentRate}/£` }
    }
  }

  // Monthly totals for weights and allocation
  const totalMonthlyEmiINR = useMemo(() => {
    return emiAccounts
      .filter((a) => a.status === 'Active' && a.frequency === 'Monthly')
      .reduce((sum, a) => {
        const val = a.currency === 'INR' ? Number(a.targetAmount) : Number(a.targetAmount) * (Number(rate) || 108)
        return sum + val
      }, 0)
  }, [emiAccounts, rate])

  const totalMonthlyAssetINR = useMemo(() => {
    return assetAccounts
      .filter((a) => a.status === 'Active' && a.frequency === 'Monthly')
      .reduce((sum, a) => {
        const val = a.currency === 'INR' ? Number(a.targetAmount) : Number(a.targetAmount) * (Number(rate) || 108)
        return sum + val
      }, 0)
  }, [assetAccounts, rate])

  const combinedMonthlyINR = totalMonthlyEmiINR + totalMonthlyAssetINR
  const emiPercent = combinedMonthlyINR > 0 ? Math.round((totalMonthlyEmiINR / combinedMonthlyINR) * 100) : 50
  const assetPercent = combinedMonthlyINR > 0 ? 100 - emiPercent : 50

  // Filtered list based on active tab and search query
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesFilter =
        activeFilter === 'ALL' ||
        (activeFilter === 'EMI' && acc.type === 'EMI') ||
        (activeFilter === 'ASSET' && acc.type === 'Asset')

      const matchesSearch =
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.notes && acc.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        acc.currency.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [accounts, activeFilter, searchQuery])

  // Alternating palette pattern across rows: Red, Black, Blue, Black (never same color side-by-side)
  const getThemeForIndex = (index, acc) => {
    // Specifically style India Equity Index SIP with White Card + Red, Blue & Black Guilloche Lines
    if (acc?.name && acc.name.toLowerCase().includes('india equity index sip')) {
      return TRICOLOR_WHITE_THEME
    }
    // Pattern sequence: 0 (Red), 1 (Black), 2 (Blue), 3 (Black-Gold)
    return THEMES[index % THEMES.length]
  }

  return (
    <div className="space-y-7 animate-slide-up">
      {/* ========================================================= */}
      {/* 1. HERO COCKPIT: BANKNOTE TEXTURED STAT TILES             */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Tile 1: Committed Debt (Titanium Red - Hero "How It Works" Style) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-red-900/60 shadow-lg bg-[#B0102B] text-white flex flex-col justify-between"
          style={{
            backgroundImage: BEFORE_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-red-100">
              Committed Debt
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              <CreditCard className="w-3 h-3" />
              {derived.activeEMIsCount} Active
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-white">
              {fmtCurrency(totalMonthlyEmiINR, 'INR')}
            </div>
            <p className="text-[11px] font-semibold text-red-200 mt-1">
              Total Monthly Loan Outflow
            </p>
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-red-300 to-transparent rounded-full opacity-80" />
        </motion.div>

        {/* Tile 2: Wealth Reserves (Royal Blue - Hero "Start Free" Style) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-blue-900/60 shadow-lg bg-[#00439F] text-white flex flex-col justify-between"
          style={{
            backgroundImage: BANKNOTE_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-blue-100">
              Wealth Reserves
            </span>
            <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              <TrendingUp className="w-3 h-3" />
              {derived.activeAssetsCount} Targets
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-white">
              {fmtCurrency(totalMonthlyAssetINR, 'INR')}
            </div>
            <p className="text-[11px] font-semibold text-blue-200 mt-1">
              Monthly Wealth Allocations
            </p>
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-80" />
        </motion.div>

        {/* Tile 3: Outgoings in GBP (Titanium Obsidian Black) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-slate-800 shadow-lg bg-[#12151B] text-white flex flex-col justify-between"
          style={{
            backgroundImage: BLACK_TEXT_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-slate-300">
              Net Outflow (GBP)
            </span>
            <span className="inline-flex items-center gap-1 bg-white/15 text-white border border-white/25 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              <Wallet className="w-3 h-3 text-[#00cc44]" />
              Combined
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight text-white">
              £{(derived.activeMonthlyOutgoingsGBP || 0).toFixed(0)}
              <span className="text-xs font-semibold text-slate-400 ml-1">/mo</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              UK Currency Commitment
            </p>
          </div>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-slate-400 to-transparent rounded-full opacity-80" />
        </motion.div>

        {/* Tile 4: Exchange Benchmark (Crisp Daylight White with Banknote Texture) */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden rounded-card p-5 border border-border shadow-sm bg-white text-primary flex flex-col justify-between"
          style={{
            backgroundImage: WHITE_TEXT_URL,
            backgroundPosition: 'center',
            backgroundSize: 'auto 150%',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-secondary">
              FX Benchmark
            </span>
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Anchor Rate
            </span>
          </div>
          <div>
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-black text-steel-500 tracking-tight">
              ₹{rate}
              <span className="text-xs font-semibold text-secondary ml-1">/ £1</span>
            </div>
            <p className="text-[11px] font-semibold text-secondary mt-1">
              Live Conversion Valuation Base
            </p>
          </div>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 2. DUAL-TEXTURE CASHFLOW ALLOCATION METER                 */}
      {/* ========================================================= */}
      <div
        className="rounded-card border border-border bg-surface p-6 shadow-sm relative overflow-hidden"
        style={{ backgroundImage: WHITE_TEXT_URL }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#00cc44] shadow-[0_0_6px_rgba(0,204,68,0.6)]" />
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-secondary">
                Cashflow Allocation Engine
              </span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-primary tracking-tight mt-0.5">
              Monthly Debt Payoff vs Wealth Accumulation
            </h3>
          </div>

          {/* Allocation Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Red Pill */}
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-button border border-red-900/40 text-xs font-mono text-white shadow-sm"
              style={{
                backgroundImage: BEFORE_URL,
                backgroundColor: '#B0102B',
                backgroundSize: 'auto 150%',
              }}
            >
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="font-bold">Debt EMIs: {emiPercent}%</span>
              <span className="text-red-200">({fmtCurrency(totalMonthlyEmiINR, 'INR')}/mo)</span>
            </div>

            {/* Blue Pill */}
            <div
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-button border border-blue-900/40 text-xs font-mono text-white shadow-sm"
              style={{
                backgroundImage: BANKNOTE_URL,
                backgroundColor: '#00439F',
                backgroundSize: 'auto 150%',
              }}
            >
              <span className="h-2 w-2 rounded-full bg-[#00cc44] shadow-[0_0_6px_rgba(0,204,68,0.6)]" />
              <span className="font-bold">Wealth Assets: {assetPercent}%</span>
              <span className="text-blue-200">({fmtCurrency(totalMonthlyAssetINR, 'INR')}/mo)</span>
            </div>
          </div>
        </div>

        {/* Dual-Texture Proportion Bar */}
        <div className="relative h-5 w-full bg-surface-2 rounded-full overflow-hidden p-0.5 border border-border flex shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${emiPercent}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-l-full relative cursor-pointer overflow-hidden border-r border-black/20"
            style={{
              backgroundImage: BEFORE_URL,
              backgroundColor: '#B0102B',
              backgroundSize: 'cover',
            }}
            title={`Liabilities: ${emiPercent}%`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </motion.div>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${assetPercent}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="h-full rounded-r-full relative cursor-pointer overflow-hidden"
            style={{
              backgroundImage: BANKNOTE_URL,
              backgroundColor: '#00439F',
              backgroundSize: 'cover',
            }}
            title={`Assets: ${assetPercent}%`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </motion.div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-secondary font-semibold mt-2 px-1">
          <span className="text-red-700 font-bold">← Debt Payoff Velocity (Red)</span>
          <span className="text-secondary/70">Dynamic 36-Month Allocation Balance</span>
          <span className="text-blue-800 font-bold">Liquid Wealth Growth (Blue) →</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. ASSET MANAGEMENT CENTER (FILTER, SEARCH & CARDS)       */}
      {/* ========================================================= */}
      <Card
        eyebrow="Asset Management System (AMS)"
        title="Live Accounts & Loan Portfolio"
        action={
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openCreateModal('EMI')}
            className="relative z-10 px-5 py-3 rounded-full font-bold sm:font-extrabold uppercase tracking-wider text-[12px] sm:text-xs transition-all bg-[#00439F] text-white hover:opacity-90 shadow-xl border border-blue-900/50 text-center flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap active:scale-95"
            style={{
              backgroundImage: BANKNOTE_URL,
              backgroundPosition: 'center',
              backgroundSize: 'auto 150%',
            }}
          >
            <Plus className="w-4 h-4 text-[#00cc44]" />
            <span>✦ Add Account / EMI</span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
          </motion.button>
        }
      >
        <p className="text-xs sm:text-sm text-secondary mb-6 leading-relaxed">
          Manage your verified debt obligations, loan amortizations, liquid reserves, and overseas SIPs. Real-time entries synchronize with your 3-year freedom projection.
        </p>

        {/* Filter Toolbar with Animated Tabs & Quick Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-6 border-b border-border">
          {/* Segmented Filter Pills */}
          <div className="inline-flex p-1 rounded-button bg-surface-2 border border-border self-start">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-4 py-1.5 rounded-[12px] text-xs font-bold transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-surface text-primary shadow-sm border border-border'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              All Portfolio ({accounts.length})
            </button>
            <button
              onClick={() => setActiveFilter('EMI')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[12px] text-xs font-bold transition-all ${
                activeFilter === 'EMI'
                  ? 'bg-surface text-rose-600 shadow-sm border border-border'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Liabilities ({emiAccounts.length})</span>
            </button>
            <button
              onClick={() => setActiveFilter('ASSET')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[12px] text-xs font-bold transition-all ${
                activeFilter === 'ASSET'
                  ? 'bg-surface text-[#00cc44] shadow-sm border border-border'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Assets ({assetAccounts.length})</span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="w-4 h-4 text-secondary/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, notes, currency..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-button border border-border bg-surface-2 text-primary placeholder-secondary/50 focus:bg-surface focus:border-steel-500 focus:outline-none focus:ring-4 focus:ring-steel-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-surface-2/50 rounded-card border border-dashed border-border mt-6">
            <div className="w-14 h-14 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-3 shadow-sm-clean">
              <Landmark className="w-6 h-6 text-secondary" />
            </div>
            <h4 className="font-display font-bold text-base text-primary">No Matching Financial Accounts</h4>
            <p className="text-xs text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `No accounts matched your search for "${searchQuery}".`
                : 'Get started by creating your first liability or wealth-building buffer.'}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-primary text-surface text-xs font-bold shadow-button hover:opacity-95 transition-all"
            >
              <Plus className="w-4 h-4 text-[#00cc44]" />
              <span>Create First Account</span>
            </button>
          </div>
        ) : (
          /* ========================================================= */
          /* 4. ALTERNATING RED, BLACK & BLUE BANKNOTE CARDS           */
          /* ========================================================= */
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6"
          >
            <AnimatePresence>
              {filteredAccounts.map((acc, index) => {
                const theme = getThemeForIndex(index, acc)
                const isLiability = acc.type === 'EMI'
                const isActive = acc.status === 'Active'
                const reciprocal = getReciprocalEquivalent(acc.targetAmount, acc.currency)

                // Calculate weight percentage
                const baseTotal = isLiability ? totalMonthlyEmiINR : totalMonthlyAssetINR
                const inrAmount = acc.currency === 'INR' ? Number(acc.targetAmount) : Number(acc.targetAmount) * (Number(rate) || 108)
                const weightPct = baseTotal > 0 && acc.frequency === 'Monthly' ? Math.min(100, Math.round((inrAmount / baseTotal) * 100)) : null

                return (
                  <motion.div
                    key={acc.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className={`rounded-card border p-6 shadow-md transition-all flex flex-col justify-between relative overflow-hidden group ${theme.bgColor} ${theme.border} ${theme.glow}`}
                    style={{
                      backgroundImage: theme.bgUrl,
                      backgroundPosition: 'center',
                      backgroundSize: 'auto 150%',
                    }}
                  >
                    <div>
                      {/* Top Row: Icon Badge, Title & Status */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {/* Tactile Icon Badge */}
                          <div
                            className={`w-11 h-11 rounded-[16px] flex items-center justify-center border shadow-sm shrink-0 transition-transform group-hover:scale-105 ${theme.iconBox}`}
                          >
                            {isLiability ? (
                              <CreditCard className="w-5 h-5" />
                            ) : (
                              <TrendingUp className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <h4 className={`font-display font-bold text-base sm:text-lg leading-tight tracking-tight ${theme.title}`}>
                              {acc.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}
                              >
                                {isLiability ? 'Loan EMI' : 'Wealth Asset'}
                              </span>
                              <span className={`text-[11px] font-semibold ${theme.sub}`}>
                                • {acc.currency}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Beacon */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs transition-colors ${
                            isActive
                              ? 'bg-[#00cc44] text-[#0A2612] border-[#00cc44] shadow-[0_0_10px_rgba(0,204,68,0.35)]'
                              : theme.badge
                          }`}
                        >
                          {isActive && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A2612] opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0A2612]" />
                            </span>
                          )}
                          {acc.status}
                        </span>
                      </div>

                      {/* Financial Hero Box */}
                      <div className={`p-4 rounded-button border mb-4 ${theme.innerBox}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <span className={`text-[10px] font-display font-bold uppercase tracking-wider block mb-1 ${theme.innerBoxSub}`}>
                              Scheduled Allocation
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`font-mono tabular-nums text-2xl sm:text-3xl font-black tracking-tight ${theme.amount}`}
                              >
                                {fmtCurrency(acc.targetAmount, acc.currency)}
                              </span>
                              <span className={`text-xs font-bold ${theme.innerBoxSub}`}>
                                / {acc.frequency}
                              </span>
                            </div>
                          </div>

                          {/* Reciprocal Converted Value */}
                          <div className="text-right">
                            <span className={`text-[10px] font-display font-bold uppercase tracking-wider block mb-1 ${theme.innerBoxSub}`}>
                              Reciprocal ({reciprocal.rateText})
                            </span>
                            <span className={`font-mono tabular-nums text-xs sm:text-sm font-bold px-2.5 py-1 rounded-md border inline-block shadow-sm ${theme.equivBadge}`}>
                              {reciprocal.value}
                            </span>
                          </div>
                        </div>

                        {/* Weight Commitment Progress Bar */}
                        {weightPct !== null && (
                          <div className={`mt-3.5 pt-3 border-t ${theme.isDark ? 'border-white/15' : 'border-slate-200/80'}`}>
                            <div className="flex items-center justify-between text-[11px] mb-1.5">
                              <span className={`font-medium flex items-center gap-1 ${theme.innerBoxSub}`}>
                                <Percent className="w-3 h-3 opacity-80" />
                                Portfolio Weight
                              </span>
                              <span className={`font-mono font-bold ${theme.title}`}>
                                {weightPct}% of {isLiability ? 'monthly liabilities' : 'asset targets'}
                              </span>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden border border-white/10 ${theme.trackBg}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${weightPct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={`h-full rounded-full ${theme.trackFill}`}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes Box */}
                      {acc.notes && (
                        <div className={`p-3 rounded-button border text-xs leading-relaxed mb-4 flex items-start gap-2.5 shadow-2xs ${theme.innerBox}`}>
                          <Info className="w-3.5 h-3.5 opacity-80 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{acc.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className={`flex items-center justify-between pt-3.5 border-t ${theme.isDark ? 'border-white/15' : 'border-slate-200/80'} text-xs`}>
                      <button
                        onClick={() =>
                          updateAccount(acc.id, {
                            status: acc.status === 'Active' ? 'Paused' : 'Active',
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border transition-colors font-semibold ${theme.actionBtn}`}
                      >
                        {acc.status === 'Active' ? (
                          <>
                            <Pause className="w-3 h-3 opacity-80" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 text-[#00cc44]" />
                            <span>Resume</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(acc)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] transition-colors font-bold border shadow-sm-clean ${theme.actionBtn}`}
                        >
                          <Pencil className="w-3 h-3 opacity-80" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove account "${acc.name}"?`)) deleteAccount(acc.id)
                          }}
                          className={`p-2 rounded-[10px] transition-colors ${theme.dangerBtn}`}
                          title="Delete account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom fine gradient highlight line */}
                    <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r ${theme.accentLine} rounded-full opacity-80`} />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* 5. SWISS-STYLE EXECUTIVE MODAL (ADD / EDIT)               */}
      {/* ========================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Financial Account' : 'Configure New Account / Loan'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm text-primary">
          {/* Interactive Account Category Cards */}
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider text-secondary mb-2">
              Portfolio Category *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'EMI' })}
                className={`p-3.5 rounded-button border text-left transition-all flex items-center gap-3 ${
                  form.type === 'EMI'
                    ? 'border-rose-500 bg-rose-50/60 shadow-sm'
                    : 'border-border bg-surface-2 hover:bg-surface'
                }`}
              >
                <div className="w-9 h-9 rounded-[12px] bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-display font-bold text-xs block text-primary">Debt / Loan EMI</span>
                  <span className="text-[10px] text-secondary">Committed liability</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'Asset' })}
                className={`p-3.5 rounded-button border text-left transition-all flex items-center gap-3 ${
                  form.type === 'Asset'
                    ? 'border-[#00cc44] bg-[#00cc44]/10 shadow-sm'
                    : 'border-border bg-surface-2 hover:bg-surface'
                }`}
              >
                <div className="w-9 h-9 rounded-[12px] bg-[#00cc44]/15 flex items-center justify-center text-[#00cc44] shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-display font-bold text-xs block text-primary">Asset / Reserve</span>
                  <span className="text-[10px] text-secondary">Wealth investment</span>
                </div>
              </button>
            </div>
          </div>

          {/* Account Title Field */}
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider text-secondary mb-1.5" htmlFor="acc-name">
              Account / Loan Title *
            </label>
            <input
              id="acc-name"
              type="text"
              required
              placeholder="e.g. India Car Loan EMI or Vanguard ISA SIPP"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-input border border-border bg-surface px-4 py-2.5 text-xs sm:text-sm font-medium text-primary placeholder-secondary/50 focus:border-steel-500 focus:outline-none focus:ring-4 focus:ring-steel-500/10"
            />
          </div>

          {/* Currency & Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-display font-bold text-xs uppercase tracking-wider text-secondary mb-1.5">
                Currency
              </label>
              <div className="flex p-1 rounded-input bg-surface-2 border border-border">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, currency: 'INR' })}
                  className={`flex-1 py-1.5 rounded-[12px] font-mono font-bold text-xs transition-all ${
                    form.currency === 'INR'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  ₹ INR
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, currency: 'GBP' })}
                  className={`flex-1 py-1.5 rounded-[12px] font-mono font-bold text-xs transition-all ${
                    form.currency === 'GBP'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  £ GBP
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-display font-bold text-xs uppercase tracking-wider text-secondary mb-1.5" htmlFor="acc-amt">
                Scheduled Target Amount *
              </label>
              <input
                id="acc-amt"
                type="number"
                required
                min="0"
                placeholder="5000"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="w-full rounded-input border border-border bg-surface px-4 py-2.5 font-mono tabular-nums text-xs sm:text-sm font-bold text-primary placeholder-secondary/50 focus:border-steel-500 focus:outline-none focus:ring-4 focus:ring-steel-500/10"
              />
            </div>
          </div>

          {/* Frequency & Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-display font-bold text-xs uppercase tracking-wider text-secondary mb-1.5" htmlFor="acc-freq">
                Payment Frequency
              </label>
              <select
                id="acc-freq"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full rounded-input border border-border bg-surface px-3 py-2 text-xs font-semibold text-primary focus:border-steel-500 focus:outline-none"
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Target">One-time Target</option>
              </select>
            </div>

            <div>
              <label className="block font-display font-bold text-xs uppercase tracking-wider text-secondary mb-1.5" htmlFor="acc-status">
                Initial Status
              </label>
              <select
                id="acc-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-input border border-border bg-surface px-3 py-2 text-xs font-semibold text-primary focus:border-steel-500 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Notes Field */}
          <div>
            <label className="block font-display font-bold text-xs uppercase tracking-wider text-secondary mb-1.5" htmlFor="acc-notes">
              Description / Bank Details (Optional)
            </label>
            <textarea
              id="acc-notes"
              rows={2}
              placeholder="e.g. Standing order from Barclays on 1st of every month"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-input border border-border bg-surface p-3 text-xs text-primary placeholder-secondary/50 focus:border-steel-500 focus:outline-none focus:ring-4 focus:ring-steel-500/10 resize-none"
            />
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-button border border-border bg-surface hover:bg-surface-2 transition-colors font-semibold text-xs text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="relative z-10 px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs transition-all bg-[#00439F] text-white hover:opacity-90 shadow-xl border border-blue-900/50 text-center flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap active:scale-95"
              style={{
                backgroundImage: BANKNOTE_URL,
                backgroundPosition: 'center',
                backgroundSize: 'auto 150%',
              }}
            >
              <span>{editingId ? 'Save Modifications' : 'Confirm & Activate'}</span>
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
