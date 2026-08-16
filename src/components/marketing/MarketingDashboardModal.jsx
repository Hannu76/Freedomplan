import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Mail,
  Send,
  Calendar,
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Smartphone,
  Monitor,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react'

export default function MarketingDashboardModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'preview' | 'history'
  const [statusData, setStatusData] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [previewDevice, setPreviewDevice] = useState('desktop') // 'desktop' | 'mobile'

  // Test Email State
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Campaign Trigger State
  const [isTriggering, setIsTriggering] = useState(false)
  const [triggerResult, setTriggerResult] = useState(null)
  const [forceTrigger, setForceTrigger] = useState(false)

  const fetchStatus = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/marketing/status')
      if (res.ok) {
        const data = await res.json()
        setStatusData(data)
      }
    } catch (err) {
      console.error('Error fetching marketing status:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/marketing/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err)
    }
  }

  const fetchCampaignDetails = async (campaignId) => {
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedCampaign(data.campaign)
        setRecipients(data.recipients || [])
      }
    } catch (err) {
      console.error('Error fetching campaign details:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStatus()
      fetchCampaigns()
    }
  }, [isOpen])

  const handleSendTestEmail = async (e) => {
    e.preventDefault()
    if (!testEmail || !testEmail.includes('@')) return

    setIsSendingTest(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/marketing/campaigns/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, name: 'Marketing Previewer' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send test email')
      setTestResult({ success: true, message: `Dispatched preview email to ${testEmail}` })
    } catch (err) {
      setTestResult({ success: false, message: err.message })
    } finally {
      setIsSendingTest(false)
    }
  }

  const handleTriggerFridayCampaign = async () => {
    if (!window.confirm('Are you sure you want to trigger the weekly Friday campaign now?')) {
      return
    }

    setIsTriggering(true)
    setTriggerResult(null)

    try {
      const res = await fetch('/api/marketing/campaigns/send-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: forceTrigger }),
      })
      const data = await res.json()

      if (res.status === 409) {
        setTriggerResult({
          duplicate: true,
          message: data.message || 'Duplicate: This campaign has already run today.',
        })
      } else if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger campaign')
      } else {
        setTriggerResult({
          success: true,
          message: `Campaign executed successfully! Sent to ${data.sent} recipients (${data.failed} failed).`,
        })
        fetchStatus()
        fetchCampaigns()
      }
    } catch (err) {
      setTriggerResult({ success: false, message: err.message })
    } finally {
      setIsTriggering(false)
    }
  }

  if (!isOpen) return null

  const stats = statusData?.stats || {
    totalSubscribers: 0,
    activeAudienceCount: 0,
    unsubscribedCount: 0,
    totalCampaignsCount: 0,
  }

  const nextRunDate = statusData?.nextScheduledRun
    ? new Date(statusData.nextScheduledRun).toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : 'Every Friday 09:00 UTC'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Marketing Campaign Engine</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    Isolated & Active
                  </span>
                </div>
                <p className="text-xs text-slate-400">Weekly Friday Promotional System • OTP Untouched</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TABS */}
              <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'preview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Email Template
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Campaign History
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-950 to-slate-900/50">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* STATUS BANNER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900/60 border border-blue-800/30 gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Next Automated Friday Send</span>
                      <div className="text-base font-bold text-white">{nextRunDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={fetchStatus}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview Template
                    </button>
                  </div>
                </div>

                {/* STATS METRIC GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-semibold">Active Audience</span>
                      <Users className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black text-white">{stats.activeAudienceCount}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Eligible for Friday send</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-semibold">Total Subscribers</span>
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-black text-white">{stats.totalSubscribers}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Registered with consent</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-semibold">Unsubscribed</span>
                      <Shield className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black text-white">{stats.unsubscribedCount}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Suppressed from promo</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all">
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                      <span className="text-xs font-semibold">Campaigns Sent</span>
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-black text-white">{stats.totalCampaignsCount}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Friday executions</p>
                  </div>
                </div>

                {/* TWO-COLUMN ACTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SEND TEST EMAIL BOX */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Send className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Send Live Test Email</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Dispatches a live preview of the promotional email to your inbox to verify rendering and unsubscribe links.
                    </p>

                    <form onSubmit={handleSendTestEmail} className="space-y-3">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={isSendingTest}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSendingTest ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Dispatching...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Send Test Email
                          </>
                        )}
                      </button>
                    </form>

                    {testResult && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                          testResult.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* RUN CAMPAIGN BOX */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-white">Manual Friday Campaign Trigger</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Dispatches the weekly promotion to all <strong>{stats.activeAudienceCount}</strong> eligible customers. Protected by duplicate send prevention.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="force-trigger"
                        checked={forceTrigger}
                        onChange={(e) => setForceTrigger(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0"
                      />
                      <label htmlFor="force-trigger" className="text-xs text-slate-400 cursor-pointer">
                        Bypass duplicate protection guard (Force re-send)
                      </label>
                    </div>

                    <button
                      onClick={handleTriggerFridayCampaign}
                      disabled={isTriggering || stats.activeAudienceCount === 0}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-purple-600/20"
                    >
                      {isTriggering ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Executing Campaign...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Execute Weekly Campaign Now
                        </>
                      )}
                    </button>

                    {triggerResult && (
                      <div
                        className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                          triggerResult.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : triggerResult.duplicate
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}
                      >
                        {triggerResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : triggerResult.duplicate ? (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{triggerResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW TAB */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Live Email Template Preview</h3>
                    <p className="text-xs text-slate-400">
                      Campaign Asset: "Turn Your Reach Into Earnings" (£35+ benefits & one-click unsubscribe)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                          previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                        title="Desktop View"
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                          previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                        title="Mobile View"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>

                    <a
                      href="/api/marketing/preview"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Open in new window"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="flex justify-center bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80">
                  <div
                    className={`transition-all duration-300 bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 ${
                      previewDevice === 'mobile' ? 'w-[375px] h-[650px]' : 'w-full max-w-[650px] h-[650px]'
                    }`}
                  >
                    <iframe
                      src="/api/marketing/preview"
                      title="Email Preview"
                      className="w-full h-full border-0 bg-[#0b0f19]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Campaign Execution History</h3>
                  <p className="text-xs text-slate-400">Complete records and recipient delivery logs</p>
                </div>

                {campaigns.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80">
                    <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No campaigns recorded yet.</p>
                    <p className="text-xs text-slate-600 mt-1">The first campaign will record automatically on Friday.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="p-3.5 font-semibold">Campaign Name</th>
                            <th className="p-3.5 font-semibold">Execution Date</th>
                            <th className="p-3.5 font-semibold">Audience</th>
                            <th className="p-3.5 font-semibold">Delivered</th>
                            <th className="p-3.5 font-semibold">Status</th>
                            <th className="p-3.5 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                          {campaigns.map((camp) => (
                            <tr key={camp.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3.5 font-medium text-white">{camp.name}</td>
                              <td className="p-3.5 text-slate-400">
                                {new Date(camp.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3.5 text-slate-300">{camp.totalRecipients || 0}</td>
                              <td className="p-3.5 text-emerald-400 font-semibold">{camp.successCount || 0}</td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    camp.status === 'completed'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {camp.status}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <button
                                  onClick={() => fetchCampaignDetails(camp.id)}
                                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                                >
                                  View Logs <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {selectedCampaign && (
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white">
                            Recipient Logs for {selectedCampaign.name}
                          </h4>
                          <button
                            onClick={() => setSelectedCampaign(null)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Close Logs
                          </button>
                        </div>

                        {recipients.length === 0 ? (
                          <p className="text-xs text-slate-500">No recipient log entries for this campaign.</p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 text-xs">
                            {recipients.map((rec) => (
                              <div key={rec.id} className="p-2.5 flex items-center justify-between bg-slate-950/60">
                                <span className="font-mono text-slate-300">{rec.email}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">{new Date(rec.sentAt).toLocaleTimeString()}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                    {rec.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
