import React, { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, CURRENCY } from '../config'
import { Card, StatTile } from './ui'

export default function CurrencyConverter() {
  const { rate, setRate } = useStore()
  const [gbpInput, setGbpInput] = useState(PLAN.yearlyTarget)

  const inrValue = gbpInput * rate
  const belowThreshold = rate < CURRENCY.lowRateWarningThreshold

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatTile
          label="Conversion Equivalent"
          value={`₹${inrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          sub={`For £${gbpInput.toLocaleString('en-GB')} input`}
          accent="text-[#161C2D]"
          badge="Converted"
        />
        <StatTile
          label="Live Exchange Anchor"
          value={`₹${rate} / £`}
          sub={belowThreshold ? `Below ₹${CURRENCY.lowRateWarningThreshold} target threshold` : 'Above target threshold'}
          accent={belowThreshold ? 'text-rose-600' : 'text-[#161C2D]'}
          badge="Rate Anchor"
        />
      </div>

      <Card eyebrow="Live forex anchor" title="Real-Time Currency & Remittance Converter">
        <div className="space-y-6">
          <p className="text-xs sm:text-sm text-[#667085]">
            Calculate your cross-border UK GBP to India INR remittances. Updating the exchange anchor dynamically recalibrates your entire AMS valuation across accounts and loans.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 shadow-sm-clean">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#161C2D] mb-2.5" htmlFor="gbp-input">
                GBP Amount to Convert
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-[#667085] figure text-lg font-bold">£</span>
                <input
                  id="gbp-input"
                  type="number"
                  min="0"
                  value={gbpInput}
                  onChange={(e) => setGbpInput(Number(e.target.value) || 0)}
                  className="input figure w-full !height-[52px] !pl-10 !pr-4 !py-3 text-lg font-bold"
                />
              </div>
            </div>

            <div className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 shadow-sm-clean">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#161C2D] mb-2.5" htmlFor="rate-input">
                Exchange Rate Anchor (1 GBP = ₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-[#667085] figure text-lg font-bold">₹</span>
                <input
                  id="rate-input"
                  type="number"
                  min="1"
                  step="0.5"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0)}
                  className="input figure w-full !height-[52px] !pl-10 !pr-4 !py-3 text-lg font-bold"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 shadow-sm-clean flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#667085] mb-1">
                Net Remittance Equivalent
              </p>
              <p className="figure text-2xl sm:text-3xl font-bold text-[#161C2D] tracking-tight">
                £{gbpInput.toLocaleString('en-GB')} <span className="text-[#667085] font-normal">=</span> <span className="text-[#161C2D]">₹{inrValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </p>
            </div>
            <span className="bg-[#B6F36A]/20 text-[#161C2D] border border-[#B6F36A]/40 text-xs font-bold px-3.5 py-1.5 rounded-full shrink-0">
              at ₹{rate}/£
            </span>
          </div>

          {belowThreshold && (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 p-4 flex items-center gap-3 text-xs sm:text-sm font-semibold text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span>
                Alert: Exchange anchor has dropped below ₹{CURRENCY.lowRateWarningThreshold}. Your transfers currently yield fewer INR than projected.
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
