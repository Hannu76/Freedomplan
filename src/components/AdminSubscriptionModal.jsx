import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, AlertCircle, Search, Save, UserCheck, Lock, LogOut,
  RefreshCw, Sparkles, Mail, Send, Calendar, Users, Eye, Monitor, Smartphone,
  ExternalLink, ChevronRight, TrendingUp, CreditCard, FileSpreadsheet, Settings,
  Check, Copy, DownloadCloud, Globe, HelpCircle, Phone, ArrowUpRight
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwK8959N1rGAZgyNMLJk-McUt95rDZfQ4s8U_IM7mYwS1talcaltSv8abxYAr-8MqVTTQ/exec';

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
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0 && interval) {
      clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [resendTimer]);

  // Dashboard customer state
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all'); // 'all' | 'premium' | 'free'
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPlan, setNewCustomerPlan] = useState('Premium');
  const [savingEmail, setSavingEmail] = useState(null);
  const [sendingPaymentEmail, setSendingPaymentEmail] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  // Google Sheet Sync State
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSheetSync, setLastSheetSync] = useState(null);
  const [sheetSyncStatus, setSheetSyncStatus] = useState({ ok: true, message: 'Ready to sync', count: 0 });
  const [showSheetSettings, setShowSheetSettings] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState(() => {
    try {
      return localStorage.getItem('freedomPlan.googleSheetUrl') || DEFAULT_APPS_SCRIPT_URL;
    } catch (_) {
      return DEFAULT_APPS_SCRIPT_URL;
    }
  });
  const [copiedSnippet, setCopiedSnippet] = useState(false);

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

  const getAuthHeaders = () => {
    const token = adminToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('freedomPlan.adminToken') : '') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

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
      const res = await fetch('/api/marketing/status', {
        headers: getAuthHeaders(),
      });
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
      const res = await fetch('/api/marketing/campaigns', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMarketingCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.includes('@')) return;

    setIsSendingTest(true);
    setTestResult(null);

    const cleanEmail = testEmail.trim().toLowerCase();

    try {
      const res = await fetch('/api/marketing/campaigns/test-send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ testEmail: cleanEmail, name: 'Admin Previewer' }),
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        throw new Error('Your admin session has expired. Please log in again.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Email could not be sent. Please try again.');
      }

      setTestResult({
        success: true,
        message: `Promotion email sent successfully to ${cleanEmail}.`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Email could not be sent. Please try again.',
      });
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
        headers: getAuthHeaders(),
        body: JSON.stringify({ force: forceTrigger }),
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        throw new Error('Your admin session has expired. Please log in again.');
      }
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
      const res = await fetch('/api/admin/subscriptions', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        if (data.lastSheetSync) setLastSheetSync(data.lastSheetSync);
        if (data.sheetSyncStatus) setSheetSyncStatus(data.sheetSyncStatus);
      } else {
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

  const handleSyncGoogleSheet = async (overrideUrl = null) => {
    setIsSyncingSheet(true);
    setErrorMsg('');
    setSuccessMsg('');
    const targetUrl = overrideUrl || sheetUrlInput.trim();

    try {
      const res = await fetch('/api/admin/sync-sheet', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sheetUrl: targetUrl }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
        setLastSheetSync(new Date().toISOString());
        setSheetSyncStatus(data.sheetSyncStatus || { ok: true, message: `Synced ${data.syncedCount || data.customers?.length || 0} accounts`, count: data.customers?.length || 0 });
        setSuccessMsg(`Google Sheet synced! Loaded ${data.customers?.length || 0} customer accounts.`);
        setTimeout(() => setSuccessMsg(''), 4500);
      } else {
        await fetchCustomers();
        setSuccessMsg('Refreshed customer accounts from all local and sheet stores.');
        setTimeout(() => setSuccessMsg(''), 3500);
      }
    } catch (err) {
      console.error('Error syncing Google Sheet:', err);
      setErrorMsg('Failed to sync with Google Sheet: ' + err.message);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const handleSaveSheetUrl = () => {
    try {
      localStorage.setItem('freedomPlan.googleSheetUrl', sheetUrlInput.trim());
      setSuccessMsg('Google Sheet URL configuration saved.');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowSheetSettings(false);
      handleSyncGoogleSheet(sheetUrlInput.trim());
    } catch (_) {}
  };

  const handleCopyScriptSnippet = () => {
    const snippet = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var data = rows.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[String(h).trim()] = row[i]; });
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify({ success: true, customers: data }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
    navigator.clipboard?.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 3000);
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
      setResendTimer(30);
      setView('otp');
    } catch (err) {
      setErrorMsg('Unable to connect to admin authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAdminOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanOtp = otp.replace(/\D/g, '').trim();

    if (cleanOtp.length < 6) {
      setErrorMsg('Please enter the complete 6-digit OTP received on your Gmail.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (adminEmail || 'freedomplan786@gmail.com').trim().toLowerCase(),
          otp: cleanOtp,
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: normalizedEmail,
          plan: targetPlan,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update subscription on server');
      }

      setCustomers(prev =>
        prev.map(c =>
          c.email.toLowerCase() === normalizedEmail
            ? { ...c, plan: targetPlan, isPremium: targetPlan === 'Premium' }
            : c
        )
      );

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

  const handleSendPaymentLink = async (targetCustomer) => {
    if (!targetCustomer?.email) return;
    const targetEmail = targetCustomer.email.trim().toLowerCase();
    const targetName = targetCustomer.name || targetEmail.split('@')[0];
    const targetPhone = targetCustomer.phone || '';

    setSendingPaymentEmail(targetEmail);
    setPaymentResult(null);

    try {
      const res = await fetch('/api/request-payment-link', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: targetEmail,
          name: targetName,
          phone: targetPhone,
          loanAmount: targetCustomer.loanAmount,
          isOutsideUK: targetCustomer.isOutsideUK,
          plan: 'FreedomPlan Premium',
          amount: 499,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send payment link.');
      }

      setPaymentResult({
        success: true,
        email: targetEmail,
        message: `Payment link sent successfully to ${targetEmail}.`,
      });
      setTimeout(() => setPaymentResult(null), 6000);
    } catch (err) {
      setPaymentResult({
        success: false,
        email: targetEmail,
        message: err.message || 'Payment link could not be sent. Please try again.',
      });
      setTimeout(() => setPaymentResult(null), 6000);
    } finally {
      setSendingPaymentEmail(null);
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
    setNewCustomerName('');
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

  const isValidCustomerEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const clean = email.toLowerCase().trim();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean)) return false;
    if (
      clean.includes('example.com') ||
      clean.includes('testuser') ||
      clean.includes('test_new') ||
      clean.includes('test_customer') ||
      clean.includes('student_test') ||
      clean.includes('live_verify') ||
      clean.includes('idempotent_user') ||
      clean.includes('brand_new_') ||
      clean.includes('india_1787') ||
      clean.includes('ukuser1_') ||
      clean.includes('ukuser2_') ||
      clean.includes('newuser_1787') ||
      clean.startsWith('test_') ||
      clean.startsWith('testuser_') ||
      clean.includes('student_1787') ||
      clean === 'bjnljnlknj@gmail.com' ||
      clean === 'ncjbkn' ||
      clean === 'john.smith@gmail.com'
    ) return false;
    return true;
  };

  const validCustomers = useMemo(() => {
    return (customers || []).filter(c => isValidCustomerEmail(c?.email));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return validCustomers.filter(c => {
      const matchesSearch =
        (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || '').includes(searchQuery);
      if (planFilter === 'premium') return matchesSearch && (c.plan === 'Premium' || c.isPremium);
      if (planFilter === 'free') return matchesSearch && !(c.plan === 'Premium' || c.isPremium);
      return matchesSearch;
    });
  }, [validCustomers, searchQuery, planFilter]);

  const premiumCount = validCustomers.filter(c => c.plan === 'Premium' || c.isPremium).length;
  const freeCount = validCustomers.length - premiumCount;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-2xl lg:max-w-5xl xl:max-w-6xl bg-white dark:bg-[#070C18] rounded-[28px] shadow-2xl border border-slate-200/90 dark:border-slate-800/90 overflow-hidden text-slate-900 dark:text-white my-auto max-h-[94vh] flex flex-col"
        >
          {/* Top Bar / Executive Header */}
          <div className="bg-gradient-to-r from-[#061224] via-[#0A2540] to-[#0D1F36] p-5 sm:p-6 text-white relative border-b border-blue-900/50 shrink-0">
            {/* Ambient Red-Blue Glow Orbs */}
            <div className="absolute top-0 right-1/4 w-72 h-28 bg-blue-600/20 blur-3xl pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-1/3 w-64 h-24 bg-rose-600/15 blur-3xl pointer-events-none rounded-full" />

            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-rose-500/80 text-white flex items-center justify-center transition-all shadow-sm active:scale-90 z-10"
              title="Close Admin Portal"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-rose-600 text-white flex items-center justify-center font-black shadow-[0_4px_20px_rgba(37,99,235,0.4)] border border-white/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">
                      Freedom CRM Command Center
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-slate-300">Live Enterprise Edition</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5 text-white">
                    {view === 'dashboard' ? 'Customer Subscription & Sheet Intelligence' : 'Admin Security Access'}
                  </h2>
                </div>
              </div>

              {/* View Switcher / Quick Stats Pill */}
              {view === 'dashboard' && (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-3 text-xs font-mono tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="font-bold text-slate-200">Total:</span>
                      <span className="font-black text-white">{customers.length}</span>
                    </div>
                    <span className="text-white/20">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="font-bold text-amber-300">⭐ {premiumCount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback alerts */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2 shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="text-xs font-bold hover:underline">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2 shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg('')} className="text-xs font-bold hover:underline">✕</button>
            </div>
          )}

          {/* Content Body Container (Scrollable) */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {/* VIEW 1: ADMIN LOGIN */}
            {view === 'login' && (
              <form onSubmit={handleSendAdminOtp} className="space-y-5 max-w-md mx-auto py-8">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white mx-auto flex items-center justify-center mb-3 shadow-[0_8px_24px_rgba(37,99,235,0.35)] border border-blue-400/30">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Sign In With Authorized Freedom CRM Gmail
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Only authorized administrator accounts can manage customer subscriptions and campaigns.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Authorized Admin Gmail
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdminEmail('freedomplan786@gmail.com')}
                      className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Default Admin</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. freedomplan786@gmail.com"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(37,99,235,0.35)] bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 border border-blue-400/40 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isLoading ? 'Sending Security Code to Gmail...' : 'Send Admin OTP Verification'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 2: ADMIN OTP VERIFICATION */}
            {view === 'otp' && (
              <form onSubmit={handleVerifyAdminOtp} className="space-y-5 max-w-md mx-auto py-8">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-700 text-white mx-auto flex items-center justify-center mb-3 shadow-[0_8px_24px_rgba(225,29,72,0.35)] border border-rose-400/30">
                    <Shield className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Enter Admin Security Code
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter the 6-digit OTP code sent to <span className="font-bold text-slate-900 dark:text-white">{adminEmail || 'freedomplan786@gmail.com'}</span>
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-3.5 bg-white dark:bg-slate-950 border-2 border-blue-500/50 rounded-xl text-center text-2xl font-mono font-black tracking-[0.5em] text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || otp.replace(/\D/g, '').length < 6}
                    className="w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_20px_rgba(225,29,72,0.35)] bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 border border-rose-400/40 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{isLoading ? 'Verifying Security Code...' : 'Verify & Unlock Admin Console'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 px-1 text-xs">
                  <button
                    type="button"
                    onClick={() => { setView('login'); setOtp(''); setErrorMsg(''); }}
                    className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    ← Back to Email
                  </button>

                  <button
                    type="button"
                    onClick={handleSendAdminOtp}
                    disabled={isLoading || resendTimer > 0}
                    className={`font-bold transition-colors ${resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 dark:text-blue-400 hover:underline'}`}
                  >
                    {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code to Gmail'}
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 3: ADMIN DASHBOARD (SUBSCRIPTIONS & MARKETING CONSOLE) */}
            {view === 'dashboard' && (
              <div className="space-y-6">
                {/* Admin Status & Google Sheet Sync Toolbar */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 dark:from-slate-900/90 dark:via-blue-950/20 dark:to-slate-900/90 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
                  {/* Left: Admin Identity */}
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Authenticated Admin:
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                          {adminEmail || 'freedomplan786@gmail.com'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Managing automated Google Sheet synchronization & marketing campaigns
                      </span>
                    </div>
                  </div>

                  {/* Right: Google Sheet Sync & Logout Controls */}
                  <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
                    {/* Live Sheet Sync Indicator Pill */}
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[170px] sm:max-w-[240px]">
                        {sheetSyncStatus?.message || `Synced (${customers.length} users)`}
                      </span>
                    </div>

                    {/* Sync Sheet Now Button */}
                    <button
                      onClick={() => handleSyncGoogleSheet()}
                      disabled={isSyncingSheet || isLoading}
                      className="group relative px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_rgba(37,99,235,0.3)] bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 border border-blue-400/40 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      title="Fetch live customer rows from Google Sheets now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-blue-200 group-hover:text-white ${isSyncingSheet ? 'animate-spin' : ''}`} />
                      <span>{isSyncingSheet ? 'Syncing...' : 'Sync Sheet Now'}</span>
                    </button>

                    {/* Sheet Settings Toggle */}
                    <button
                      onClick={() => setShowSheetSettings(!showSheetSettings)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shrink-0"
                      title="Configure Google Sheet / Apps Script Webhook"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>

                    {/* Log Out */}
                    <button
                      onClick={handleAdminLogout}
                      className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>

                {/* Google Sheet Config Popover Drawer */}
                {showSheetSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gradient-to-br from-slate-900 to-[#001C44] text-white rounded-2xl border border-blue-500/40 shadow-xl space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-sm font-black tracking-wide">Google Sheet & Apps Script Integration Settings</h4>
                      </div>
                      <button onClick={() => setShowSheetSettings(false)} className="text-slate-400 hover:text-white text-xs font-bold">✕ Close</button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Enter your Google Sheet Webhook URL, CSV export link, or public sheet link. The system will automatically scrape and merge newly registered or manually added customers into the admin console.
                    </p>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Active Google Sheet / Webhook URL
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={sheetUrlInput}
                          onChange={(e) => setSheetUrlInput(e.target.value)}
                          placeholder="https://script.google.com/macros/s/.../exec or https://docs.google.com/spreadsheets/d/.../export?format=csv"
                          className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-400"
                        />
                        <button
                          onClick={handleSaveSheetUrl}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-sm"
                        >
                          Save & Connect
                        </button>
                      </div>
                    </div>

                    {/* Apps Script doGet helper snippet */}
                    <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300">
                          ⚡ Tip: Enable 1-Click Direct JSON Sync in Google Apps Script
                        </span>
                        <button
                          onClick={handleCopyScriptSnippet}
                          className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSnippet ? 'Copied Snippet!' : 'Copy doGet() Code'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Paste the snippet into your Google Apps Script editor to allow instant 2-way sync on every refresh.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Sub-Console Tab Switcher */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <button
                    onClick={() => setAdminTab('subscriptions')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      adminTab === 'subscriptions'
                        ? 'bg-gradient-to-r from-[#001C44] to-blue-700 dark:from-blue-600 dark:to-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Customer Subscriptions ({customers.length})</span>
                  </button>
                  <button
                    onClick={() => { setAdminTab('marketing'); fetchMarketingStatus(); fetchMarketingCampaigns(); }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                      adminTab === 'marketing'
                        ? 'bg-gradient-to-r from-blue-600 to-rose-600 text-white shadow-md'
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
                    {/* Payment Link Feedback Banner */}
                    {paymentResult && (
                      <div
                        className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border transition-all ${
                          paymentResult.success
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {paymentResult.success ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>{paymentResult.message}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPaymentResult(null)}
                          className="text-[11px] font-bold underline opacity-70 hover:opacity-100"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}

                    {/* Quick Add / Direct Subscription Form */}
                    <form
                      onSubmit={handleAddNewCustomer}
                      className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-slate-50 to-rose-50/40 dark:from-blue-950/30 dark:via-slate-900/60 dark:to-rose-950/20 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl shadow-xs"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Directly Assign Customer Subscription & Access
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5">
                          <input
                            type="email"
                            required
                            value={newCustomerEmail}
                            onChange={(e) => setNewCustomerEmail(e.target.value)}
                            placeholder="Customer email (e.g. student@gmail.com)"
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-inner"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            placeholder="Customer name (optional)"
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-inner"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <select
                            value={newCustomerPlan}
                            onChange={(e) => setNewCustomerPlan(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none shadow-inner"
                          >
                            <option value="Premium">⭐ Premium</option>
                            <option value="Free">Free</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="submit"
                            disabled={savingEmail === newCustomerEmail}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_16px_rgba(225,29,72,0.28)] bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-500 hover:to-rose-500 border border-rose-400/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Access</span>
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Customer List Header, Filter & Search Toolbar */}
                    <div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Customer Accounts ({filteredCustomers.length})
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Auto-Synced
                          </span>
                        </div>

                        {/* Filter Tabs & Refresh */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
                            <button
                              onClick={() => setPlanFilter('all')}
                              className={`px-2.5 py-1 rounded-lg transition-colors ${planFilter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-500'}`}
                            >
                              All ({customers.length})
                            </button>
                            <button
                              onClick={() => setPlanFilter('premium')}
                              className={`px-2.5 py-1 rounded-lg transition-colors ${planFilter === 'premium' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-300 shadow-xs font-extrabold' : 'text-slate-500'}`}
                            >
                              ⭐ Premium ({premiumCount})
                            </button>
                            <button
                              onClick={() => setPlanFilter('free')}
                              className={`px-2.5 py-1 rounded-lg transition-colors ${planFilter === 'free' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-extrabold' : 'text-slate-500'}`}
                            >
                              Free ({freeCount})
                            </button>
                          </div>

                          <button
                            onClick={fetchCustomers}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 transition-colors shrink-0"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                          </button>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative mb-3">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search customer by email, name, or phone number..."
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Desktop Rectangular Table / Mobile Card View */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950/60 shadow-xs">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-12 text-center text-xs font-semibold text-slate-400 space-y-2">
                            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                            <p>No customer accounts found matching your filter or query.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50 dark:bg-slate-900/90 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                                <tr>
                                  <th className="py-3 px-4">Customer Account</th>
                                  <th className="py-3 px-4 hidden md:table-cell">Contact Phone</th>
                                  <th className="py-3 px-4">Status / Tier</th>
                                  <th className="py-3 px-4 text-center">Payment Link</th>
                                  <th className="py-3 px-4 text-right">Assign Plan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                                {filteredCustomers.map((customer) => {
                                  const isCurrentPremium = customer.plan === 'Premium' || customer.isPremium;
                                  const isSaving = savingEmail === customer.email;
                                  const isSendingThisPayment = sendingPaymentEmail === customer.email;

                                  return (
                                    <tr
                                      key={customer.email}
                                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                                    >
                                      {/* Customer Info */}
                                      <td className="py-3 px-4">
                                        <div className="flex flex-col min-w-0">
                                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate font-mono">
                                            {customer.email}
                                          </span>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                              {customer.name || customer.email.split('@')[0]}
                                            </span>
                                            {customer.source && (
                                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                {customer.source.replace(/_/g, ' ')}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      {/* Phone */}
                                      <td className="py-3 px-4 hidden md:table-cell">
                                        <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums text-xs">
                                          {customer.phone || '—'}
                                        </span>
                                      </td>

                                      {/* Plan Badge */}
                                      <td className="py-3 px-4">
                                        <span
                                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                                            isCurrentPremium
                                              ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80 shadow-xs'
                                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                          }`}
                                        >
                                          {isCurrentPremium ? '⭐ Premium' : 'Free'}
                                        </span>
                                      </td>

                                      {/* Send Payment Link Button (Textured Royal Blue) */}
                                      <td className="py-3 px-4 text-center">
                                        <button
                                          type="button"
                                          disabled={isSendingThisPayment}
                                          onClick={() => handleSendPaymentLink(customer)}
                                          className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_rgba(37,99,235,0.3)] bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 hover:from-blue-600 hover:to-indigo-500 border border-blue-400/40 active:scale-95 disabled:opacity-50 shrink-0"
                                          title={`Send Razorpay Payment Link email to ${customer.email}`}
                                        >
                                          <CreditCard className={`w-3.5 h-3.5 text-blue-200 group-hover:text-white ${isSendingThisPayment ? 'animate-spin' : ''}`} />
                                          <span>{isSendingThisPayment ? 'Sending...' : 'Send Payment Link'}</span>
                                        </button>
                                      </td>

                                      {/* Action Selector */}
                                      <td className="py-3 px-4 text-right">
                                        <div className="inline-flex items-center gap-1.5">
                                          <select
                                            disabled={isSaving}
                                            value={isCurrentPremium ? 'Premium' : 'Free'}
                                            onChange={(e) => handleSetSubscription(customer.email, e.target.value)}
                                            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:border-slate-400 focus:outline-none shadow-xs"
                                          >
                                            <option value="Free">Free</option>
                                            <option value="Premium">⭐ Premium</option>
                                          </select>

                                          {isSaving && (
                                            <span className="text-[10px] font-bold text-blue-600 animate-pulse font-mono">
                                              Saving...
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SUB-TAB 2: MARKETING ENGINE CONSOLE (RECTANGULAR WIDESCREEN DASHBOARD) ── */}
                {adminTab === 'marketing' && (
                  <div className="space-y-6">
                    {/* Status & Next Schedule Banner */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 border border-blue-200 dark:border-blue-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                            Automated Weekly Marketing Schedule
                          </span>
                          <p className="text-sm font-black text-slate-900 dark:text-white font-mono">
                            {marketingStatus?.nextScheduledRun
                              ? new Date(marketingStatus.nextScheduledRun).toLocaleString()
                              : 'Every Friday 09:00 UTC'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={fetchMarketingStatus}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Status</span>
                      </button>
                    </div>

                    {/* Marketing Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Active Audience</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                          {marketingStatus?.stats?.activeAudienceCount || 0}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Eligible recipients</span>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Subscribers</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                          {marketingStatus?.stats?.totalSubscribers || 0}
                        </div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Registered users</span>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Unsubscribed</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                          {marketingStatus?.stats?.unsubscribedCount || 0}
                        </div>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Suppressed list</span>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Campaigns Sent</span>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                          {marketingStatus?.stats?.totalCampaignsCount || 0}
                        </div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Weekly runs</span>
                      </div>
                    </div>

                    {/* Action Cards: Test Dispatch & Manual Trigger */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Send Live Test Email */}
                      <div className="p-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Send Test Promotional Email
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          Dispatches an instant preview to your personal inbox to verify layout and delivery.
                        </p>
                        <form onSubmit={handleSendTestEmail} className="space-y-2.5">
                          <input
                            type="email"
                            required
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="your-email@example.com"
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={isSendingTest}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_rgba(37,99,235,0.3)] bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 border border-blue-400/40 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {isSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span>Send Live Test</span>
                          </button>
                        </form>
                        {testResult && (
                          <div className={`p-2.5 rounded-xl text-xs font-bold ${testResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200'}`}>
                            {testResult.message}
                          </div>
                        )}
                      </div>

                      {/* Manual Friday Trigger */}
                      <div className="p-5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Manual Campaign Trigger
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          Dispatches weekly promotion to all eligible recipients with duplicate send protection.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="admin-force-trigger"
                            checked={forceTrigger}
                            onChange={(e) => setForceTrigger(e.target.checked)}
                            className="rounded bg-slate-50 border-slate-300 text-rose-600"
                          />
                          <label htmlFor="admin-force-trigger" className="text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                            Bypass duplicate protection
                          </label>
                        </div>
                        <button
                          onClick={handleTriggerFridayCampaign}
                          disabled={isTriggering}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_rgba(225,29,72,0.3)] bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 border border-rose-400/40 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {isTriggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                          <span>Execute Weekly Campaign</span>
                        </button>
                        {triggerResult && (
                          <div className={`p-2.5 rounded-xl text-xs font-bold ${triggerResult.success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200' : triggerResult.duplicate ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200' : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200'}`}>
                            {triggerResult.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Campaign History Table */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Recent Campaign Runs
                      </h4>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-950/60">
                        {marketingCampaigns.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-semibold">No campaigns recorded yet.</div>
                        ) : (
                          marketingCampaigns.map((c) => (
                            <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 text-xs">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                                <span className="block text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  {c.successCount || 0} Delivered
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  {c.status}
                                </span>
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
