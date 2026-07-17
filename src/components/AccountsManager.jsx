import React, { useState } from 'react'
import { useStore } from '../context/StoreContext'
import { Card, Badge, StatTile, Modal } from './ui'

export default function AccountsManager() {
  const { accounts, addAccount, updateAccount, deleteAccount, rate, derived } = useStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form State
  const [form, setForm] = useState({
    name: '',
    type: 'EMI',
    targetAmount: '',
    currency: 'INR',
    frequency: 'Monthly',
    status: 'Active',
    notes: '',
  })

  function openCreateModal() {
    setEditingId(null)
    setForm({
      name: '',
      type: 'EMI',
      targetAmount: 5000,
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

  const emiAccounts = accounts.filter((a) => a.type === 'EMI')
  const assetAccounts = accounts.filter((a) => a.type === 'Asset')

  const fmtCurrency = (amt, curr) => {
    return curr === 'INR'
      ? `₹${amt.toLocaleString('en-IN')}`
      : `£${amt.toLocaleString('en-GB')}`
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <StatTile
          label="Active EMIs & Loans"
          value={derived.activeEMIsCount}
          sub="Committed Liabilities"
          accent="text-rose-600"
          badge="Liabilities"
        />
        <StatTile
          label="Active Asset Targets"
          value={derived.activeAssetsCount}
          sub="Investments & Buffers"
          accent="text-[#161C2D]"
          badge="Assets"
        />
        <StatTile
          label="Monthly Outgoings (GBP Eq.)"
          value={`£${derived.activeMonthlyOutgoingsGBP.toFixed(0)}/mo`}
          sub="EMI & SIP combined"
          accent="text-[#161C2D]"
          badge="Outflow"
        />
        <StatTile
          label="Exchange Anchor"
          value={`₹${rate}`}
          sub="1 GBP conversion"
          accent="text-[#4A7BFF]"
          badge="FX Rate"
        />
      </div>

      {/* Main AMS Accounts Center Card */}
      <Card
        eyebrow="Asset Management System (AMS)"
        title="Accounts, EMIs & Investment Center"
        action={
          <button
            onClick={openCreateModal}
            className="button text-xs uppercase tracking-wider !height-[40px] !py-2 !px-4"
          >
            <span>+ Add Account / EMI</span>
          </button>
        }
      >
        <p className="text-xs sm:text-sm text-[#667085] mb-8">
          Track and manage all your loans, monthly EMIs, emergency buffers, and India SIPs across multiple currencies. All entries dynamically calculate your net financial position.
        </p>

        {/* Section 1: EMIs & Liabilities */}
        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F7]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-2">
              <span>Liabilities & Loan EMIs</span>
              <span className="text-[11px] bg-rose-500/15 text-rose-600 px-2.5 py-0.5 rounded-full font-bold">{emiAccounts.length}</span>
            </h3>
          </div>

          {emiAccounts.length === 0 ? (
            <p className="text-xs text-[#667085] italic py-4">No active loan EMIs configured.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {emiAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 transition-all hover:-translate-y-1 hover:shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-bold text-sm sm:text-base text-[#161C2D] leading-tight">
                        {acc.name}
                      </h4>
                      <Badge variant={acc.status === 'Active' ? 'good' : 'default'}>
                        {acc.status}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="figure text-xl sm:text-2xl font-bold text-rose-600">
                        {fmtCurrency(acc.targetAmount, acc.currency)}
                      </span>
                      <span className="text-xs text-[#667085] figure font-medium">/ {acc.frequency}</span>
                    </div>
                    {acc.notes && (
                      <p className="text-xs text-[#667085] mb-4 line-clamp-2 bg-white p-3 rounded-[12px] border border-[#EEF2F7]">
                        {acc.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EEF2F7] text-xs">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="px-3 py-1.5 rounded-[10px] bg-white hover:bg-[#EEF2F7] text-[#161C2D] transition-colors font-semibold border border-[#EEF2F7] shadow-sm-clean"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => updateAccount(acc.id, { status: acc.status === 'Active' ? 'Paused' : 'Active' })}
                      className="px-3 py-1.5 rounded-[10px] border border-[#EEF2F7] text-[#667085] hover:text-[#161C2D] hover:bg-white transition-colors font-medium"
                    >
                      {acc.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete account "${acc.name}"?`)) deleteAccount(acc.id)
                      }}
                      className="px-2.5 py-1.5 rounded-[10px] text-rose-600 hover:bg-rose-50 transition-colors font-bold"
                      title="Delete account"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Assets & Investments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F7]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#161C2D] flex items-center gap-2">
              <span>Assets, Buffers & Investments</span>
              <span className="text-[11px] bg-[#B6F36A]/20 text-[#161C2D] px-2.5 py-0.5 rounded-full font-bold">{assetAccounts.length}</span>
            </h3>
          </div>

          {assetAccounts.length === 0 ? (
            <p className="text-xs text-[#667085] italic py-4">No asset accounts configured.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {assetAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-[18px] border border-[#EEF2F7] bg-[#F9FBFD] p-6 transition-all hover:-translate-y-1 hover:shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-bold text-sm sm:text-base text-[#161C2D] leading-tight">
                        {acc.name}
                      </h4>
                      <Badge variant={acc.status === 'Active' ? 'good' : 'default'}>
                        {acc.status}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="figure text-xl sm:text-2xl font-bold text-[#161C2D]">
                        {fmtCurrency(acc.targetAmount, acc.currency)}
                      </span>
                      <span className="text-xs text-[#667085] figure font-medium">/ {acc.frequency}</span>
                    </div>
                    {acc.notes && (
                      <p className="text-xs text-[#667085] mb-4 line-clamp-2 bg-white p-3 rounded-[12px] border border-[#EEF2F7]">
                        {acc.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EEF2F7] text-xs">
                    <button
                      onClick={() => openEditModal(acc)}
                      className="px-3 py-1.5 rounded-[10px] bg-white hover:bg-[#EEF2F7] text-[#161C2D] transition-colors font-semibold border border-[#EEF2F7] shadow-sm-clean"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => updateAccount(acc.id, { status: acc.status === 'Active' ? 'Paused' : 'Active' })}
                      className="px-3 py-1.5 rounded-[10px] border border-[#EEF2F7] text-[#667085] hover:text-[#161C2D] hover:bg-white transition-colors font-medium"
                    >
                      {acc.status === 'Active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete account "${acc.name}"?`)) deleteAccount(acc.id)
                      }}
                      className="px-2.5 py-1.5 rounded-[10px] text-rose-600 hover:bg-rose-50 transition-colors font-bold"
                      title="Delete account"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal for Add/Edit Account */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit AMS Account / EMI' : 'Add New AMS Account'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm text-[#161C2D]">
          <div>
            <label className="block font-bold text-xs uppercase tracking-wider text-[#667085] mb-1.5" htmlFor="acc-name">
              Account / Loan Name *
            </label>
            <input
              id="acc-name"
              type="text"
              required
              placeholder="e.g. India Car Loan EMI"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input w-full !height-[44px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-xs uppercase tracking-wider text-[#667085] mb-1.5" htmlFor="acc-type">
                Account Type
              </label>
              <select
                id="acc-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input w-full !height-[44px]"
              >
                <option value="EMI">Liability / Loan EMI</option>
                <option value="Asset">Asset / Investment / Buffer</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-xs uppercase tracking-wider text-[#667085] mb-1.5" htmlFor="acc-status">
                Status
              </label>
              <select
                id="acc-status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input w-full !height-[44px]"
              >
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-xs uppercase tracking-wider text-[#667085] mb-1.5" htmlFor="acc-curr">
                Currency
              </label>
              <select
                id="acc-curr"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="input w-full !height-[44px] figure"
              >
                <option value="INR">INR (₹)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-xs uppercase tracking-wider text-[#667085] mb-1.5" htmlFor="acc-amt">
                Amount *
              </label>
              <input
                id="acc-amt"
                type="number"
                required
                min="0"
                placeholder="5000"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                className="input w-full !height-[44px] figure"
              />
            </div>

            <div>
              <label className="block font-bold text-xs uppercase tracking-wider text-[#667085] mb-1.5" htmlFor="acc-freq">
                Frequency
              </label>
              <select
                id="acc-freq"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="input w-full !height-[44px]"
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Target">One-time Target</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-xs uppercase tracking-wider text-[#667085] mb-1.5" htmlFor="acc-notes">
              Notes / Description
            </label>
            <textarea
              id="acc-notes"
              rows={3}
              placeholder="e.g. Deducted on 5th of every month via ICICI Bank"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-[16px] border border-[#EEF2F7] bg-white p-3.5 text-[#161C2D] placeholder-[#667085]/40 focus:border-[#B6F36A] focus:outline-none focus:ring-4 focus:ring-[#B6F36A]/15 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EEF2F7]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-[14px] border border-[#EEF2F7] hover:bg-[#F9FBFD] transition-colors font-semibold text-[#667085]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button !height-[40px] !py-2 !px-5 text-xs uppercase tracking-wider"
            >
              {editingId ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
