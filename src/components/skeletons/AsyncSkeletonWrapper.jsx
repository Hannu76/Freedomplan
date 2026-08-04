import React, { useState, useEffect } from 'react';
import './Skeleton.css';

/**
 * Higher-Order Wrapper for Async Content with Skeleton Loading,
 * Error State, Empty State, and Smooth 200ms Fade-In/Out Transitions.
 */
export default function AsyncSkeletonWrapper({
  isLoading = false,
  skeleton = null,
  error = null,
  onRetry = null,
  isEmpty = false,
  emptyState = null,
  children,
}) {
  const [showContent, setShowContent] = useState(!isLoading);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShowContent(false);
      setIsFadingOut(false);
    } else {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setIsFadingOut(false);
        setShowContent(true);
      }, 150); // 150ms smooth transition matching Rule 4
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Rule 11: API Failure Handling -> Show Error State
  if (error && !isLoading) {
    return (
      <div className="skeleton-card p-8 text-center space-y-4 max-w-md mx-auto my-6 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Failed to load content</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {typeof error === 'string' ? error : error.message || 'An unexpected network error occurred.'}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  // Rule 12: Empty States Handling -> Differentiate from Loading
  if (isEmpty && !isLoading && !error) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="skeleton-card p-8 text-center space-y-3 max-w-md mx-auto my-6">
        <div className="text-3xl text-slate-300 dark:text-slate-600">📭</div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No data available</h3>
        <p className="text-xs text-slate-400">There are no records to display at this time.</p>
      </div>
    );
  }

  // Rule 1 & Rule 3 & Rule 13: Show SkeletonPlaceholder while loading
  if (isLoading || !showContent) {
    return (
      <div
        className={`w-full transition-opacity duration-150 ${isFadingOut ? 'skeleton-fade-out' : 'opacity-100'}`}
        aria-busy="true"
      >
        {skeleton}
      </div>
    );
  }

  // Content is ready: smooth fade in
  return (
    <div className="w-full content-fade-in" aria-busy="false">
      {children}
    </div>
  );
}
