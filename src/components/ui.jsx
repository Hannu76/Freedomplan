import React, { useEffect, useState, useRef } from 'react'
export function Card({ title, eyebrow, action, centerAction, children, className = '', glow = false }) {
  return (
    <section
      className={`card rounded-[22px] border border-[#EEF2F7] bg-white p-7 sm:p-[28px] shadow-card transition-all duration-350 animate-slide-in-bottom ${className}`}
    >
      {(eyebrow || title || action || centerAction) && (
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-[#EEF2F7]">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#667085] mb-1 flex items-center gap-1.5 animate-stagger delay-100">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B6F36A]" />
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#161C2D] tracking-tight animate-stagger delay-200">
                {title}
              </h2>
            )}
          </div>
          {centerAction && (
            <div className="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center justify-center animate-stagger delay-200">
              {centerAction}
            </div>
          )}
          {action && <div className="shrink-0 flex items-center gap-2 animate-stagger delay-300">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function ProgressBar({ value, max, onTrack = true, showLabel = true, heightClass = 'h-3' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-xs sm:text-sm mb-2 figure font-medium text-[#161C2D]">
          <span>
            {value.toLocaleString('en-GB', { maximumFractionDigits: 0 })} <span className="text-[#667085]">/ {max.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
          </span>
          <span className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
            onTrack ? 'bg-[#B6F36A]/20 text-[#161C2D] border border-[#B6F36A]/40' : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
          }`}>
            {pct.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={`${heightClass} w-full rounded-full bg-[#F9FBFD] overflow-hidden p-0.5 border border-[#EEF2F7]`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            onTrack ? 'bg-[#B6F36A]' : 'bg-rose-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function StatTile({ label, value, sub, accent, badge, bgImage, className = '', isLocked = false, onUnlock }) {
  let displayValue = value;
  if (typeof value === 'string' || typeof value === 'number') {
    const strVal = String(value);
    const match = strVal.match(/^([^\d]*?)([\d,.]+)([^\d]*)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2].replace(/,/g, '');
      const suffix = match[3];
      const num = Number(numStr);
      if (!isNaN(num) && numStr !== '.') {
        displayValue = <AnimatedCounter prefix={prefix} value={num} suffix={suffix} format={strVal.includes(',')} />
      }
    }
  }

  return (
    <div
      onClick={isLocked ? onUnlock : undefined}
      className={`relative isolate overflow-hidden rounded-[22px] border border-[#E7ECF4] bg-white p-6 shadow-sm-clean transition-all duration-350 ${isLocked ? 'cursor-pointer hover:border-[#161C2D]' : 'hover:-translate-y-1 hover:shadow-card'} group flex flex-col justify-between h-full min-h-[160px] ${className}`}
    >
      {bgImage && (
        <>
          <img
            src={bgImage}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover z-[-2] transition-transform duration-700 group-hover:scale-105 opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent w-full sm:w-3/5 z-[-1]" />
        </>
      )}
      
      <div className={`relative z-10 transition-all duration-500 flex flex-col justify-between h-full flex-1 ${isLocked ? 'blur-[6px] opacity-60 pointer-events-none select-none group-hover:blur-[8px]' : ''}`}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#161C2D] transition-colors">
              {label}
            </p>
            {badge && (
              <span className="bg-white/95 text-[#161C2D] border border-[#EEF2F7] text-[11px] font-bold px-3 py-1 rounded-full shadow-sm-clean">
                {badge}
              </span>
            )}
          </div>
          <h3 className={`font-display text-2xl sm:text-[28px] font-black tracking-tight figure mb-1 ${accent}`}>
            {displayValue}
          </h3>
        </div>
        {sub && <p className="text-[#667085] text-xs font-semibold">{sub}</p>}
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="flex items-center gap-2 bg-[#161C2D] text-white px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xl border border-[#334155] transform scale-95 group-hover:scale-100 transition-transform duration-300">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6F36A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             Unlock Pro
           </div>
        </div>
      )}
    </div>
  )
}


export function EditableStatTile({ label, valueNumber, prefix = '', sub, badge, bgImage, onSave, accent = '', className = '' }) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [val, setVal] = React.useState(valueNumber)

  React.useEffect(() => {
    setVal(valueNumber)
  }, [valueNumber])

  function handleSave() {
    setIsEditing(false)
    const num = Number(val)
    if (!isNaN(num) && num >= 0) {
      onSave(num)
    }
  }

  return (
    <div
      className={`relative isolate overflow-hidden rounded-[22px] border border-[#E7ECF4] bg-white p-6 shadow-sm-clean transition-all duration-350 group flex flex-col justify-between h-full min-h-[160px] ${className}`}
    >
      {bgImage && (
        <>
          <img
            src={bgImage}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover z-[-2] transition-transform duration-700 group-hover:scale-105 opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent w-full sm:w-3/5 z-[-1]" />
        </>
      )}
      <div className="relative z-10 flex flex-col justify-between h-full flex-1">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#161C2D] transition-colors">
            {label}
          </p>
          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="bg-white/95 text-[#161C2D] border border-[#EEF2F7] text-[11px] font-bold px-3 py-1 rounded-full shadow-sm-clean">
                {badge}
              </span>
            )}
            {/* Edit button  hidden until card is hovered, or shown as Save when editing */}
            {/* User requested to remove this hidden modify button for now:
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isEditing) handleSave()
                else setIsEditing(true)
              }}
              title={isEditing ? 'Save' : 'Edit amount'}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                isEditing
                  ? 'opacity-100 bg-[#161C2D] text-white border-[#161C2D] shadow-sm'
                  : 'opacity-0 group-hover:opacity-100 bg-white/95 text-[#161C2D] border-[#161C2D]/30 hover:bg-[#161C2D] hover:text-white shadow-sm-clean'
              }`}
            >
              {isEditing ? ' Save' : ' Edit'}
            </button>
            */}
          </div>
        </div>

        {isEditing ? (
          <div className="flex items-center gap-1 my-1">
            <span className="text-xl font-bold text-[#0D0F14]">{prefix}</span>
            <input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              onBlur={handleSave}
              autoFocus
              className="w-full rounded-[12px] border-2 border-[#161C2D] bg-white px-3 py-1 text-2xl font-extrabold text-[#0D0F14] focus:outline-none shadow-sm"
            />
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer flex items-center gap-2 py-1 group/val hover:bg-[#4A7BFF]/10 hover:shadow-[inset_0_0_0_1px_rgba(74,123,255,0.2)] rounded-lg px-2 -ml-2 transition-all duration-200"
            title="Click to edit"
          >
            <p className={`figure text-2xl sm:text-3xl font-extrabold tracking-tight ${accent || 'text-[#0D0F14]'} transition-colors`}>
              <AnimatedCounter prefix={prefix} value={valueNumber} />
            </p>
            {/* Pencil hint  appears on hover */}
            <span className="text-[11px] text-[#4A7BFF] opacity-0 group-hover/val:opacity-100 transition-opacity font-bold select-none">
              
            </span>
          </div>
        )}
        </div>

        {sub && <p className="text-xs font-semibold text-[#161C2D]/80 mt-2 flex items-center gap-1.5">{sub}</p>}
      </div>
    </div>
  )
}

export function Badge({ children, variant = 'default', className = '' }) {
  const styles = {
    default: 'bg-[#F9FBFD] text-[#667085] border-[#EEF2F7] hover:border-[#D0D5DD]',
    good: 'bg-[#B6F36A]/20 text-[#161C2D] font-bold border-[#B6F36A]/40',
    bad: 'bg-rose-500/15 text-rose-600 font-bold border-rose-500/30',
    marigold: 'bg-[#B6F36A]/20 text-[#161C2D] font-bold border-[#B6F36A]/40',
    steel: 'bg-[#4A7BFF]/15 text-[#3358D4] font-bold border-[#4A7BFF]/30',
    purple: 'bg-purple-500/15 text-purple-600 font-bold border-purple-500/30',
    active: 'bg-[#B6F36A] text-[#161C2D] font-bold border-transparent',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
        styles[variant] || styles.default
      } ${className}`}
    >
      {children}
    </span>
  )
}

export function ToggleSwitch({ checked, onChange, label, sublabel }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1 group">
      <div>
        {label && <span className="text-sm font-semibold text-[#161C2D] group-hover:text-[#4A7BFF] transition-colors">{label}</span>}
        {sublabel && <p className="text-xs text-[#667085]">{sublabel}</p>}
      </div>
      <div className="relative inline-block w-12 mr-2 align-middle select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-12 h-6 bg-[#EEF2F7] rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#B6F36A] peer-checked:bg-[#B6F36A] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6 border border-[#D0D5DD] shadow-inner" />
      </div>
    </label>
  )
}

export function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161C2D]/50 backdrop-blur-sm animate-slide-up">
      <div
        className="relative w-full max-w-lg rounded-[22px] border border-[#EEF2F7] bg-white p-7 sm:p-[28px] shadow-card-hover overflow-y-auto max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-[#EEF2F7] pb-4 mb-6">
          <h3 id="modal-title" className="font-display text-xl font-bold text-[#161C2D]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F9FBFD] hover:bg-[#EEF2F7] transition-colors text-[#667085] hover:text-[#161C2D] border border-[#EEF2F7]"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

export function AnimatedCounter({ value, duration = 1500, prefix = '', suffix = '', format = true }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  const currentValRef = React.useRef(Number(value) || 0);

  React.useEffect(() => {
    let startTime;
    const startValue = currentValRef.current;
    const endValue = Number(value) || 0;
    
    // cubic-bezier(0.1, 0.9, 0.2, 1) approximation
    const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    let animationFrame;
    const tick = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = easeOutExpo(progress);
      
      const nextVal = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(nextVal);
      currentValRef.current = nextVal;
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        setDisplayValue(endValue);
        currentValRef.current = endValue;
      }
    };
    
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  const formattedValue = format 
    ? Math.floor(displayValue).toLocaleString('en-IN')
    : Math.floor(displayValue);

  return <span className="animated-counter">{prefix}{formattedValue}{suffix}</span>;
}
