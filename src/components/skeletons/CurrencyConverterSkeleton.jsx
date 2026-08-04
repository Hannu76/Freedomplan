import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonAvatar, SkeletonButton } from './SkeletonPrimitives';

export default function CurrencyConverterSkeleton() {
  return (
    <div className="space-y-6 w-full" aria-busy="true">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton-card p-5 space-y-3">
            <SkeletonText lines={1} widths={['45%']} heights={['0.875rem']} />
            <SkeletonBox height="2.25rem" width="70%" borderRadius="0.375rem" />
            <SkeletonText lines={1} widths={['60%']} heights={['0.75rem']} />
          </div>
        ))}
      </div>

      {/* Main Converter Form Skeleton */}
      <div className="skeleton-card p-6 space-y-6">
        <div className="space-y-2">
          <SkeletonText lines={1} widths={['40%']} heights={['1.25rem']} />
          <SkeletonText lines={1} widths={['80%']} heights={['0.875rem']} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((k) => (
            <div key={k} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <SkeletonText lines={1} widths={['50%']} heights={['0.875rem']} />
              <SkeletonBox height="3.25rem" width="100%" borderRadius="0.75rem" />
            </div>
          ))}
        </div>

        {/* Live Forex Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
              <SkeletonText lines={1} widths={['60%']} heights={['0.75rem']} />
              <SkeletonBox height="1.5rem" width="80%" borderRadius="0.25rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
