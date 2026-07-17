import React, { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { PLAN, LOAN } from '../config'
import { Card, StatTile, Badge } from './ui'
export default function AmortizationSimulator() {
  const { simulator, setSimulator, timeline, rate, basicLoan, derived } = useStore()
  const { targetYearlyLumpSumINR } = derived
  const { extraMonthlyPrepaymentGBP, extraYearlyLumpSumINR, simulatedRate } = simulator

  // Calculate Base vs. Simulated Schedule comparison
  const simulationResults = useMemo(() => {
    let baseBalance = basicLoan
    let simBalance = basicLoan

    let basePayoffMonthIdx = -1
    let simPayoffMonthIdx = -1

    const schedule = timeline.map((m, idx) => {
      const isDecember = m.month === 11

      // Base step
      const baseEMI = Math.min(LOAN.monthlyEMIINR, baseBalance)
      baseBalance = Math.max(0, baseBalance - baseEMI)
      let baseLump = 0
      if (isDecember && baseBalance > 0) {
        baseLump = Math.min(targetYearlyLumpSumINR, baseBalance)
        baseBalance = Math.max(0, baseBalance - baseLump)
      }
      if (baseBalance === 0 && basePayoffMonthIdx === -1) {
        basePayoffMonthIdx = idx
      }

      // Simulated step
      const extraMonthlyINR = extraMonthlyPrepaymentGBP * simulatedRate
      const simEMI = Math.min(LOAN.monthlyEMIINR + extraMonthlyINR, simBalance)
      simBalance = Math.max(0, simBalance - simEMI)
      let simLump = 0
      if (isDecember && simBalance > 0) {
        simLump = Math.min(targetYearlyLumpSumINR + extraYearlyLumpSumINR, simBalance)
        simBalance = Math.max(0, simBalance - simLump)
      }
      if (simBalance === 0 && simPayoffMonthIdx === -1) {
        simPayoffMonthIdx = idx
      }

      return {
        ...m,
        idx,
        baseBalance,
        simBalance,
        baseEMI,
        baseLump,
        simEMI,
        simLump,
      }
    })

    if (basePayoffMonthIdx === -1) basePayoffMonthIdx = timeline.length - 1
    if (simPayoffMonthIdx === -1) simPayoffMonthIdx = timeline.length - 1

    const monthsShaved = Math.max(0, basePayoffMonthIdx - simPayoffMonthIdx)

    return {
      schedule,
      basePayoffMonth: timeline[basePayoffMonthIdx],
      simPayoffMonth: timeline[simPayoffMonthIdx],
      basePayoffMonthIdx,
      simPayoffMonthIdx,
      monthsShaved,
    }
  }, [timeline, extraMonthlyPrepaymentGBP, extraYearlyLumpSumINR, simulatedRate, basicLoan, targetYearlyLumpSumINR])

  const { schedule, basePayoffMonth, simPayoffMonth, monthsShaved } = simulationResults

  const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Summary Comparison Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatTile
          label="Tenure Shaved Off"
          value={monthsShaved > 0 ? `${monthsShaved} Months Earlier` : 'No change'}
          sub={`Simulated Payoff: ${simPayoffMonth.label}`}
          accent={monthsShaved > 0 ? 'text-[#161C2D]' : 'text-[#161C2D]'}
          badge="Acceleration"
        />
        <StatTile
          label="Base Plan Payoff Date"
          value={basePayoffMonth.label}
          sub={`At standard ₹${LOAN.monthlyEMIINR}/mo + ₹${(targetYearlyLumpSumINR/100000).toFixed(1)}L Dec lump`}
          accent="text-rose-600"
          badge="Base Plan"
        />
        <StatTile
          label="Simulated Forex Anchor"
          value={`₹${simulatedRate} / £`}
          sub={simulatedRate !== rate ? `Live rate is ₹${rate}` : 'Matches live rate'}
          accent="text-[#4A7BFF]"
          badge="Forex Rate"
        />
      </div>

      {/* Simulator Sandbox Sliders Card */}
      <Card
        eyebrow="What-If Sandbox"
        title="Amortization & Extra Prepayment Simulator"
        action={
          <button
            onClick={() =>
              setSimulator({
                extraMonthlyPrepaymentGBP: 0,
                extraYearlyLumpSumINR: 0,
                simulatedRate: rate,
              })
            }
            className="text-xs font-semibold px-4 py-2 rounded-[14px] bg-white text-[#161C2D] hover:bg-[#F9FBFD] border border-[#EEF2F7] transition-colors shadow-sm-clean"
          >
            Reset Sliders
          </button>
        }
      >
        <p className="text-xs sm:text-sm text-[#667085] mb-8">
          Adjust the interactive sliders below to test how additional monthly UK savings or larger December lump-sum pre-payments accelerate debt freedom.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Extra Monthly GBP */}
          <div className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 shadow-sm-clean transition-all hover:border-[#D0D5DD]">
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#161C2D]">
                Extra Monthly UK Saving
              </label>
              <span className="figure text-lg font-bold text-[#161C2D]">
                +£{extraMonthlyPrepaymentGBP}/mo
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={extraMonthlyPrepaymentGBP}
              onChange={(e) =>
                setSimulator({ ...simulator, extraMonthlyPrepaymentGBP: Number(e.target.value) })
              }
              className="w-full accent-[#161C2D] cursor-pointer"
            />
            <p className="text-[11px] text-[#667085] mt-3">
              Converts to ~₹{(extraMonthlyPrepaymentGBP * simulatedRate).toLocaleString('en-IN')} extra EMI per month.
            </p>
          </div>

          {/* Slider 2: Extra Yearly Lump Sum INR */}
          <div className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 shadow-sm-clean transition-all hover:border-[#D0D5DD]">
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#161C2D]">
                Extra December Prepayment
              </label>
              <span className="figure text-lg font-bold text-[#161C2D]">
                +₹{(extraYearlyLumpSumINR / 100000).toFixed(1)}L/yr
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="500000"
              step="25000"
              value={extraYearlyLumpSumINR}
              onChange={(e) =>
                setSimulator({ ...simulator, extraYearlyLumpSumINR: Number(e.target.value) })
              }
              className="w-full accent-[#161C2D] cursor-pointer"
            />
            <p className="text-[11px] text-[#667085] mt-3">
              Added on top of the dynamic ₹{(targetYearlyLumpSumINR/100000).toFixed(1)}L December transfer.
            </p>
          </div>

          {/* Slider 3: Simulated Exchange Rate */}
          <div className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 shadow-sm-clean transition-all hover:border-[#D0D5DD]">
            <div className="flex justify-between items-baseline mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#161C2D]">
                Simulated Forex Rate
              </label>
              <span className="figure text-lg font-bold text-[#4A7BFF]">
                ₹{simulatedRate} / £
              </span>
            </div>
            <input
              type="range"
              min="120"
              max="145"
              step="0.5"
              value={simulatedRate}
              onChange={(e) =>
                setSimulator({ ...simulator, simulatedRate: Number(e.target.value) })
              }
              className="w-full accent-[#4A7BFF] cursor-pointer"
            />
            <p className="text-[11px] text-[#667085] mt-3">
              Test how currency appreciation/depreciation affects prepayments.
            </p>
          </div>
        </div>
      </Card>

      {/* Comparison Schedule Table */}
      <Card eyebrow="Side-by-Side Schedule" title="Month-by-Month Divergence">
        <div className="overflow-x-auto -mx-2 rounded-[16px] border border-[#EEF2F7] bg-white">
          <table className="w-full text-xs sm:text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-[#667085] border-b border-[#EEF2F7] bg-[#F9FBFD]">
                <th className="py-3.5 px-4">Timeline Period</th>
                <th className="py-3.5 px-4 figure">Base Balance</th>
                <th className="py-3.5 px-4 figure text-[#161C2D]">Simulated Balance</th>
                <th className="py-3.5 px-4 figure">Simulated Paydown</th>
                <th className="py-3.5 px-4">Milestone / Divergence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F7]">
              {schedule.map((row) => {
                const diff = row.baseBalance - row.simBalance
                const isPaidOffSim = row.simBalance === 0 && row.baseBalance > 0
                return (
                  <tr
                    key={row.key}
                    className={`transition-colors hover:bg-[#F9FBFD] ${
                      row.month === 11 ? 'bg-amber-500/5 font-semibold' : ''
                    } ${isPaidOffSim ? 'bg-[#B6F36A]/15' : ''}`}
                  >
                    <td className="py-3.5 px-4 font-bold text-[#161C2D] whitespace-nowrap">
                      {row.label} {row.month === 11 && <span className="text-amber-600 ml-1">[DEC]</span>}
                    </td>
                    <td className="py-3.5 px-4 figure text-[#667085]">
                      {fmt(row.baseBalance)}
                    </td>
                    <td className="py-3.5 px-4 figure font-bold text-[#161C2D]">
                      {fmt(row.simBalance)}
                    </td>
                    <td className="py-3.5 px-4 figure text-[#93E33C] font-bold">
                      -{fmt(row.simEMI + row.simLump)}
                    </td>
                    <td className="py-3.5 px-4">
                      {isPaidOffSim ? (
                        <Badge variant="good">DEBT FREE HERE</Badge>
                      ) : diff > 0 ? (
                        <span className="text-xs text-[#93E33C] figure font-bold">
                          ₹{(diff / 100000).toFixed(2)}L ahead
                        </span>
                      ) : (
                        <span className="text-xs text-[#667085]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
