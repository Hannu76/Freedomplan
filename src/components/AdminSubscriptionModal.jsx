import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Search, Save, UserCheck, Lock, LogOut, Plus, RefreshCw, Sparkles, Mail, Send, Calendar, Users, Eye, Monitor, Smartphone, ExternalLink, ChevronRight, TrendingUp } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function AdminSubscriptionModal({ isOpen, onClose }) {
  const { users, setUsers } = useStore();

  // Views: 'login' | 'otp' | 'dashboard'
  const [view, setView] = useState('login');
  const [adminTab, setAdminTab] = useState('subscriptions'); // 'subscriptions' | 'marketing'
  const [adminEmail, setAdminEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return sessionStorage.getItem('freedomPlan.adminToken') || '';
    } catch (_) {
      return '';
    }
  });

  // Dashboard state
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerPlan, setNewCustomerPlan] = useState('Premium');
  const [savingEmail, setSavingEmail] = useState(null);

  // Marketing state inside Admin Console
  const [marketingStatus, setMarketingStatus] = useState(null);
  const [marketingCampaigns, setMarketingCampaigns] = useState([]);
  const [selectedMarketingCampaign, setSelectedMarketingCampaign] = useState(null);
  const [marketingRecipients, setMarketingRecipients] = useState([]);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [forceTrigger, setForceTrigger] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      if (adminToken) {
        setView('dashboard');
        fetchCustomers();
        fetchMarketingStatus();
        fetchMarketingCampaigns();
      } else {
        setView('login');
        setAdminEmail('');
        setOtp('');
      }
    }
  }, [isOpen, adminToken]);

  const fetchMarketingStatus = async () => {
    try {
      const res = await fetch('/api/marketing/status');
      if (res.ok) {
        const data = await res.json();
        setMarketingStatus(data);
      }
    } catch (err) {
      console.error('Error fetching marketing status:', err);
    }
  };

  const fetchMarketingCampaigns = async () => {
    try {
      const res = await fetch('/api/marketing/campaigns');
      if (res.ok) {
        const data = await res.json();
        setMarketingCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const fetchCampaignDetails = async (campaignId) => {
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMarketingCampaign(data.campaign);
        setMarketingRecipients(data.recipients || []);
      }
    } catch (err) {
      console.error('Error fetching campaign details:', err);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) return;

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/marketing/campaigns/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, name: 'Admin Previewer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send test email');
      setTestResult({ success: true, message: `Dispatched preview email to ${testEmail}` });
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTriggerFridayCampaign = async () => {
    if (!window.confirm('Are you sure you want to trigger the weekly Friday campaign now?')) {
      return;
    }

    setIsTriggering(true);
    setTriggerResult(null);

    try {
      const res = await fetch('/api/marketing/campaigns/send-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: forceTrigger }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setTriggerResult({
          duplicate: true,
          message: data.message || 'Duplicate: This campaign has already run today.',
        });
      } else if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger campaign');
      } else {
        setTriggerResult({
          success: true,
          message: `Campaign executed successfully! Sent to ${data.sent} recipients (${data.failed} failed).`,
        });
        fetchMarketingStatus();
        fetchMarketingCampaigns();
      }
    } catch (err) {
      setTriggerResult({ success: false, message: err.message });
    } finally {
      setIsTriggering(false);
    }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      } else {
        // Fallback to local users list if backend unreachable
        const mapped = users.map(u => ({
          email: u.email,
          name: u.name || u.email?.split('@')[0],
          plan: u.tier === 'pro' || u.premium ? 'Premium' : 'Free',
          isPremium: u.tier === 'pro' || u.premium,
        }));
        setCustomers(mapped);
      }
    } catch (err) {
      console.warn('Using local fallback for customer list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAdminOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!adminEmail || !adminEmail.includes('@')) {
      setErrorMsg('Please enter a valid Gmail address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Access Denied: Unauthorized admin identity.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Verification code sent to authorized admin Gmail.');
      setView('otp');
    } catch (err) {
      setErrorMsg('Unable to connect to admin authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAdminOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (otp.length < 6) {
      setErrorMsg('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid admin verification code.');
        setIsLoading(false);
        return;
      }

      const token = data.token || 'verified_admin_token';
      setAdminToken(token);
      try {
        sessionStorage.setItem('freedomPlan.adminToken', token);
      } catch (_) {}

      setView('dashboard');
      fetchCustomers();
    } catch (err) {
      setErrorMsg('Failed to verify admin authorization.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetSubscription = async (targetEmail, targetPlan) => {
    if (!targetEmail) return;
    setSavingEmail(targetEmail);
    setErrorMsg('');
    setSuccessMsg('');

    const normalizedEmail = targetEmail.trim().toLowerCase();

    try {
      const res = await fetch('/api/admin/set-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          plan: targetPlan,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update subscription on server');
      }

      // Update in local customer state
      setCustomers(prev =>
        prev.map(c =>
          c.email.toLowerCase() === normalizedEmail
            ? { ...c, plan: targetPlan, isPremium: targetPlan === 'Premium' }
            : c
        )
      );

      // Sync with StoreContext users
      setUsers(prev => (Array.isArray(prev) ? prev : []).map(u => {
        if (u.email?.toLowerCase().trim() === normalizedEmail) {
          return { ...u, tier: targetPlan === 'Premium' ? 'pro' : 'basic', premium: targetPlan === 'Premium' };
        }
        return u;
      }));

      setSuccessMsg(`Updated ${normalizedEmail} to ${targetPlan}!`);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg('Failed to save subscription change.');
    } finally {
      setSavingEmail(null);
    }
  };

  const handleAddNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerEmail || !newCustomerEmail.includes('@')) {
      setErrorMsg('Enter a valid customer email.');
      return;
    }
    const cleanEmail = newCustomerEmail.trim().toLowerCase();
    await handleSetSubscription(cleanEmail, newCustomerPlan);
    setNewCustomerEmail('');
    fetchCustomers();
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    try {
      sessionStorage.removeItem('freedomPlan.adminToken');
    } catch (_) {}
    setView('login');
    setAdminEmail('');
    setOtp('');
  };

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c =>
    (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#0E131F] rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white my-8"
        >
          {/* Top Bar / Header */}
          <div className="bg-gradient-to-r from-slate-900 via-[#001C44] to-slate-900 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-lime-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
                <Shield className="w-6 h-6 text-[#001C44]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-lime-400">
                    Admin Portal
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                  <span className="text-xs font-semibold text-slate-300">Freedom CRM</span>
                </div>
                <h2 className="text-xl font-black tracking-tight mt-0.5">
                  {view === 'dashboard' ? 'Customer Subscription Management' : 'Admin Authorization'}
                </h2>
              </div>
            </div>
          </div>

          {/* Feedback alerts */}
          {errorMsg && (
            <div className="mx-6 mt-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Content Body */}
          <div className="p-6">
            {/* VIEW 1: ADMIN LOGIN */}
            {view === 'login' && (
              <form onSubmit={handleSendAdminOtp} className="space-y-4 max-w-md mx-auto py-4">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Sign In With Authorized Freedom CRM Gmail
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Only authorized administrator accounts can access customer subscription controls.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Authorized Admin Gmail
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. freedomplan786@gmail.com"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#001C44] dark:bg-blue-600 hover:opacity-90 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying Admin Identity...' : 'Send Admin OTP'}
                </button>
              </form>
            )}

            {/* VIEW 2: ADMIN OTP VERIFICATION */}
            {view === 'otp' && (
              <form onSubmit={handleVerifyAdminOtp} className="space-y-4 max-w-md mx-auto py-4">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Enter Admin Security Code
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    We sent a 6-digit verification code to <span className="font-bold text-slate-900 dark:text-white">{adminEmail}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-center text-xl font-mono font-black tracking-[0.5em] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Authorizing...' : 'Verify & Unlock Admin Console'}
                </button>

                <button
                  type="button"
                  onClick={() => { setView('login'); setOtp(''); setErrorMsg(''); }}
                  className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  ← Back to Email Entry
                </button>
              </form>
            )}

            {/* VIEW 3: ADMIN DASHBOARD (SUBSCRIPTIONS & MARKETING CONSOLE) */}
            {view === 'dashboard' && (
              <div className="space-y-6">
                {/* Admin Status & Logout Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Authenticated Admin ({adminEmail || 'freedomplan786@gmail.com'})
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                        Managing dynamic subscriptions & marketing campaigns
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleAdminLogout}
                    className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out Admin</span>
                  </button>
                </div>

                {/* Sub-Console Tab Switcher */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <button
                    onClick={() => setAdminTab('subscriptions')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${
                      adminTab === 'subscriptions'
                        ? 'bg-[#001C44] dark:bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Customer Subscriptions</span>
                  </button>
                  <button
                    onClick={() => { setAdminTab('marketing'); fetchMarketingStatus(); fetchMarketingCampaigns(); }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 ${
                      adminTab === 'marketing'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Marketing Console</span>
                  </button>
                </div>

                {/* ── SUB-TAB 1: SUBSCRIPTION MANAGEMENT ── */}
                {adminTab === 'subscriptions' && (
                  <div className="space-y-6">
                    {/* Quick Add / Upgrade Form */}
                    <form onSubmit={handleAddNewCustomer} className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                          Directly Assign Customer Subscription
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email"
                          required
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                          placeholder="Customer email (e.g. student@gmail.com)"
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                        />
                        <select
                          value={newCustomerPlan}
                          onChange={(e) => setNewCustomerPlan(e.target.value)}
                          className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                        >
                          <option value="Premium">⭐ Premium</option>
                          <option value="Free">Free</option>
                        </select>
                        <button
                          type="submit"
                          disabled={savingEmail === newCustomerEmail}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Access</span>
                        </button>
                      </div>
                    </form>

                    {/* Customer List Header & Search */}
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Customer Accounts ({filteredCustomers.length})
                          </h4>
                        </div>
                        <button
                          onClick={fetchCustomers}
                          disabled={isLoading}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh</span>
                        </button>
                      </div>

                      <div className="relative mb-3">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search customer by email or name..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Customer Records Table / List */}
                      <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-8 text-center text-xs font-semibold text-slate-400">
                            No customer accounts found matching your query.
                          </div>
                        ) : (
                          filteredCustomers.map((customer) => {
                            const isCurrentPremium = customer.plan === 'Premium' || customer.isPremium;
                            const isSaving = savingEmail === customer.email;

                            return (
                              <div
                                key={customer.email}
                                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {customer.email}
                                  </span>
                                  <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                    {customer.name || customer.email.split('@')[0]}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Current Plan Badge */}
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                                      isCurrentPremium
                                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                    }`}
                                  >
                                    {isCurrentPremium ? '⭐ Premium' : 'Free'}
                                  </span>

                                  {/* Action Selector */}
                                  <select
                                    disabled={isSaving}
                                    value={isCurrentPremium ? 'Premium' : 'Free'}
                                    onChange={(e) => handleSetSubscription(customer.email, e.target.value)}
                                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:border-slate-400 focus:outline-none"
                                  >
                                    <option value="Free">Free</option>
                                    <option value="Premium">⭐ Premium</option>
                                  </select>

                                  {isSaving && (
                                    <span className="text-[10px] font-bold text-blue-600 animate-pulse">
                                      Saving...
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SUB-TAB 2: MARKETING ENGINE CONSOLE (CLEAN WHITE BACKGROUND) ── */}
                {adminTab === 'marketing' && (
                  <div className="space-y-6">
                    {/* Status & Next Schedule Banner */}
                    <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">Automated Weekly Schedule</span>
                          <p className="text-sm font-bold text-slate-900">
                            {marketingStatus?.nextScheduledRun
                              ? new Date(marketingStatus.nextScheduledRun).toLocaleString()
                              : 'Every Friday 09:00 UTC'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={fetchMarketingStatus}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Refresh Status
                      </button>
                    </div>

                    {/* Marketing Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500">Active Audience</span>
                        <div className="text-xl font-black text-slate-900 mt-1">{marketingStatus?.stats?.activeAudienceCount || 0}</div>
                        <span className="text-[10px] text-emerald-600 font-semibold">Eligible recipients</span>
                      </div>
                      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500">Total Subscribers</span>
                        <div className="text-xl font-black text-slate-900 mt-1">{marketingStatus?.stats?.totalSubscribers || 0}</div>
                        <span className="text-[10px] text-blue-600 font-semibold">Registered users</span>
                      </div>
                      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500">Unsubscribed</span>
                        <div className="text-xl font-black text-slate-900 mt-1">{marketingStatus?.stats?.unsubscribedCount || 0}</div>
                        <span className="text-[10px] text-amber-600 font-semibold">Suppressed</span>
                      </div>
                      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500">Campaigns Sent</span>
                        <div className="text-xl font-black text-slate-900 mt-1">{marketingStatus?.stats?.totalCampaignsCount || 0}</div>
                        <span className="text-[10px] text-purple-600 font-semibold">Weekly runs</span>
                      </div>
                    </div>

                    {/* Action Cards: Test Dispatch & Manual Trigger */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Send Live Test Email */}
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Send Test Promotional Email</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Dispatches an instant preview to your personal inbox to verify layout and delivery.
                        </p>
                        <form onSubmit={handleSendTestEmail} className="space-y-2.5">
                          <input
                            type="email"
                            required
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="your-email@example.com"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={isSendingTest}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span>Send Live Test</span>
                          </button>
                        </form>
                        {testResult && (
                          <div className={`p-2.5 rounded-xl text-xs font-bold ${testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {testResult.message}
                          </div>
                        )}
                      </div>

                      {/* Manual Friday Trigger */}
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Manual Campaign Trigger</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Dispatches weekly promotion to all eligible recipients with duplicate send protection.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="admin-force-trigger"
                            checked={forceTrigger}
                            onChange={(e) => setForceTrigger(e.target.checked)}
                            className="rounded bg-slate-50 border-slate-300 text-purple-600"
                          />
                          <label htmlFor="admin-force-trigger" className="text-xs font-semibold text-slate-600 cursor-pointer">
                            Bypass duplicate protection
                          </label>
                        </div>
                        <button
                          onClick={handleTriggerFridayCampaign}
                          disabled={isTriggering}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {isTriggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                          <span>Execute Weekly Campaign</span>
                        </button>
                        {triggerResult && (
                          <div className={`p-2.5 rounded-xl text-xs font-bold ${triggerResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : triggerResult.duplicate ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {triggerResult.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Campaign History Table */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Campaign Runs</h4>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white">
                        {marketingCampaigns.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">No campaigns recorded yet.</div>
                        ) : (
                          marketingCampaigns.map((c) => (
                            <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                              <div>
                                <span className="font-bold text-slate-900">{c.name}</span>
                                <span className="block text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-emerald-600">{c.successCount || 0} Delivered</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">{c.status}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
