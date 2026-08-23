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

  const getAuthHeaders = () => {
    const token = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('freedomPlan.adminToken') : '') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const fetchStatus = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/marketing/status', {
        headers: getAuthHeaders(),
      })
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
      const res = await fetch('/api/marketing/campaigns', {
        headers: getAuthHeaders(),
      })
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
      const res = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        headers: getAuthHeaders(),
      })
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

    const cleanEmail = testEmail.trim().toLowerCase()

    try {
      const res = await fetch('/api/marketing/campaigns/test-send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ testEmail: cleanEmail, name: 'Marketing Previewer' }),
      })
      const data = await res.json()

      if (res.status === 401 || res.status === 403) {
        throw new Error('Your admin session has expired. Please log in again.')
      }
      if (!res.ok) {
        throw new Error(data.error || 'Email could not be sent. Please try again.')
      }

      setTestResult({
        success: true,
        message: `Promotion email sent successfully to ${cleanEmail}.`,
      })
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Email could not be sent. Please try again.',
      })
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ force: forceTrigger }),
      })
      const data = await res.json()

      if (res.status === 401 || res.status === 403) {
        throw new Error('Your admin session has expired. Please log in again.')
      }
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl h-[90vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900"
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Marketing Campaign Engine</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                    Isolated & Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Weekly Friday Promotional System • OTP Untouched</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TABS */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeTab === 'preview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Email Template
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Campaign History
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* STATUS BANNER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl bg-white border border-blue-200 shadow-sm gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">Next Automated Friday Send</span>
                      <div className="text-base font-bold text-slate-900">{nextRunDate}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                      onClick={fetchStatus}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors border border-slate-200"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview Template
                    </button>
                  </div>
                </div>

                {/* STATS METRIC GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold">Active Audience</span>
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.activeAudienceCount}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Eligible for Friday send</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold">Total Subscribers</span>
                      <Mail className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.totalSubscribers}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Registered with consent</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold">Unsubscribed</span>
                      <Shield className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.unsubscribedCount}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Suppressed from promo</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-bold">Campaigns Sent</span>
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.totalCampaignsCount}</div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">Friday executions</p>
                  </div>
                </div>

                {/* TWO-COLUMN ACTIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SEND TEST EMAIL BOX */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Send className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Send Live Test Email</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Dispatches a live preview of the promotional email to your inbox to verify rendering and unsubscribe links.
                    </p>

                    <form onSubmit={handleSendTestEmail} className="space-y-3">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={isSendingTest}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-extrabold uppercase tracking-wider text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-95"
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
                        className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                          testResult.success
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
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
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-slate-900">Manual Friday Campaign Trigger</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Dispatches the weekly promotion to all <strong>{stats.activeAudienceCount}</strong> eligible customers. Protected by duplicate send prevention.
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="force-trigger"
                        checked={forceTrigger}
                        onChange={(e) => setForceTrigger(e.target.checked)}
                        className="rounded bg-slate-50 border-slate-300 text-purple-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="force-trigger" className="text-xs font-semibold text-slate-600 cursor-pointer">
                        Bypass duplicate protection guard (Force re-send)
                      </label>
                    </div>

                    <button
                      onClick={handleTriggerFridayCampaign}
                      disabled={isTriggering || stats.activeAudienceCount === 0}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-extrabold uppercase tracking-wider text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-95"
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
                        className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                          triggerResult.success
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : triggerResult.duplicate
                            ? 'bg-amber-50 border border-amber-200 text-amber-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
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
                    <h3 className="text-base font-bold text-slate-900">Live Email Template Preview</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Campaign Asset: "Turn Your Reach Into Earnings" (£35+ benefits & one-click unsubscribe)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                      <button
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                          previewDevice === 'desktop' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                        }`}
                        title="Desktop View"
                      >
                        <Monitor className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                          previewDevice === 'mobile' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
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
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-xs"
                      title="Open in new window"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="flex justify-center bg-slate-100 p-4 rounded-2xl border border-slate-200">
                  <div
                    className={`transition-all duration-300 bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-300 ${
                      previewDevice === 'mobile' ? 'w-[375px] h-[650px]' : 'w-full max-w-[650px] h-[650px]'
                    }`}
                  >
                    <iframe
                      src="/api/marketing/preview"
                      title="Email Preview"
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Campaign Execution History</h3>
                  <p className="text-xs text-slate-500 font-medium">Complete records and recipient delivery logs</p>
                </div>

                {campaigns.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No campaigns recorded yet.</p>
                    <p className="text-xs text-slate-500 mt-1">The first campaign will record automatically on Friday.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Campaign Name</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Execution Date</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Audience</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Delivered</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Status</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {campaigns.map((camp) => (
                            <tr key={camp.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5 font-bold text-slate-900">{camp.name}</td>
                              <td className="p-3.5 text-slate-500 font-medium">
                                {new Date(camp.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3.5 text-slate-700 font-semibold">{camp.totalRecipients || 0}</td>
                              <td className="p-3.5 text-emerald-600 font-bold">{camp.successCount || 0}</td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    camp.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {camp.status}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <button
                                  onClick={() => fetchCampaignDetails(camp.id)}
                                  className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
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
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900">
                            Recipient Logs for {selectedCampaign.name}
                          </h4>
                          <button
                            onClick={() => setSelectedCampaign(null)}
                            className="text-xs font-bold text-slate-500 hover:text-slate-900"
                          >
                            Close Logs
                          </button>
                        </div>

                        {recipients.length === 0 ? (
                          <p className="text-xs text-slate-400">No recipient log entries for this campaign.</p>
                        ) : (
                          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                            {recipients.map((rec) => (
                              <div key={rec.id} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                                <span className="font-mono text-slate-800 font-semibold">{rec.email}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500">{new Date(rec.sentAt).toLocaleTimeString()}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
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
