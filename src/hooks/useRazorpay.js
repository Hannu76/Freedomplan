/**
 * useRazorpay.js
 * 
 * Custom hook that handles the complete Razorpay payment flow:
 * 1. Dynamically loads the Razorpay checkout script
 * 2. Creates a Razorpay order via the backend
 * 3. Opens the Razorpay in-page checkout (no redirect, no new tab)
 * 4. On payment success, verifies the signature with the backend
 * 5. Returns { initPayment, isLoading, error, paymentStatus }
 */

import { useState, useCallback, useEffect, useRef } from 'react';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

// Dynamically load the Razorpay script (idempotent — safe to call multiple times)
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * @param {Object} options
 * @param {string}   options.email        - User email (pre-filled in Razorpay)
 * @param {string}   [options.name]       - User name (pre-filled in Razorpay)
 * @param {number}   [options.amount]     - Amount in cents (default: 524 = $5.24)
 * @param {Function} options.onSuccess    - Called with { token } when payment is verified
 * @param {Function} [options.onDismiss]  - Called if user closes the Razorpay modal
 * @param {Function} [options.onError]    - Called with an error message string
 */
export function useRazorpay({
  email,
  name = '',
  amount = 49900,
  onSuccess,
  onDismiss,
  onError,
} = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // 'idle' | 'loading-script' | 'creating-order' | 'checkout-open' | 'verifying' | 'success' | 'failed'
  const [paymentStatus, setPaymentStatus] = useState('idle');

  const razorpayInstanceRef = useRef(null);

  // Cleanup on unmount — close any open Razorpay modal
  useEffect(() => {
    return () => {
      if (razorpayInstanceRef.current) {
        try { razorpayInstanceRef.current.close(); } catch (_) { /* ignore */ }
      }
    };
  }, []);

  const initPayment = useCallback(async () => {
    // email is optional — Razorpay shows its own email field if not provided
    setIsLoading(true);
    setError(null);
    setPaymentStatus('loading-script');

    // ── Step 1: Load Razorpay script ─────────────────────────────────────────
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || !window.Razorpay) {
      const msg = 'Failed to load payment gateway. Please check your internet connection.';
      setError(msg);
      setPaymentStatus('failed');
      setIsLoading(false);
      onError?.(msg);
      return;
    }

    setPaymentStatus('creating-order');

    // ── Step 2: Create order on backend ──────────────────────────────────────
    let orderData;
    try {
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (email || 'guest@freedomplan.app').toLowerCase().trim(), amount }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create payment order.');
      }

      orderData = await response.json();
    } catch (err) {
      const msg = err.message || 'Network error. Please try again.';
      setError(msg);
      setPaymentStatus('failed');
      setIsLoading(false);
      onError?.(msg);
      return;
    }

    setPaymentStatus('checkout-open');
    setIsLoading(false);

    // ── Step 3: Open Razorpay Checkout (in-page, no redirect) ────────────────
    const rzpOptions = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'FreedomPlan',
      description: 'Premium Access — One-time Payment',
      image: '/images/freedom-plan-logo.png',
      order_id: orderData.order_id,
      prefill: {
        email: email ? email.toLowerCase().trim() : '',
        name:  name  || '',
      },
      theme: {
        color: '#161C2D',
      },
      modal: {
        backdropclose: false,   // Don't close on backdrop click
        escape: true,
        handleback: true,
        animation: true,
      },

      // ── On Payment Success (Razorpay callback) ──────────────────────────────
      handler: async (response) => {
        setPaymentStatus('verifying');
        setIsLoading(true);

        try {
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              email: (email || 'guest@freedomplan.app').toLowerCase().trim(),
            }),
          });

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok || !verifyData.verified) {
            throw new Error(verifyData.error || 'Payment verification failed.');
          }

          setPaymentStatus('success');
          setIsLoading(false);
          onSuccess?.({ token: verifyData.token, payment_id: response.razorpay_payment_id });

        } catch (err) {
          const msg = err.message || 'Verification failed. Please contact support.';
          setError(msg);
          setPaymentStatus('failed');
          setIsLoading(false);
          onError?.(msg);
        }
      },
    };

    const rzp = new window.Razorpay(rzpOptions);

    // Handle Razorpay modal dismissal (user closed it)
    rzp.on('payment.failed', (response) => {
      const msg = response?.error?.description || 'Payment failed. Please try again.';
      setError(msg);
      setPaymentStatus('failed');
      setIsLoading(false);
      onError?.(msg);
    });

    razorpayInstanceRef.current = rzp;
    rzp.open();

  }, [email, name, amount, onSuccess, onDismiss, onError]);

  return {
    initPayment,
    isLoading,
    error,
    paymentStatus,
  };
}
