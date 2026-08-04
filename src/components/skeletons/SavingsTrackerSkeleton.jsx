import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonAvatar, SkeletonButton } from './SkeletonPrimitives';

export default function SavingsTrackerSkeleton() {
  return (
    <div className="space-y-6 w-full" aria-busy="true">
      {/* Summary Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card p-5 space-y-3">
            <SkeletonText lines={1} widths={['50%']} heights={['0.875rem']} />
            <SkeletonBox height="2rem" width="70%" borderRadius="0.375rem" />
            <SkeletonText lines={1} widths={['65%']} heights={['0.75rem']} />
          </div>
        ))}
      </div>

      {/* Control Bar & Year Filter */}
      <div className="skeleton-card p-4 flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((k) => (
            <SkeletonBox key={k} width="4rem" height="2.25rem" borderRadius="0.5rem" />
          ))}
        </div>
        <SkeletonButton width="8rem" height="2.25rem" />
      </div>

      {/* Savings Grid Table Skeleton */}
      <div className="skeleton-card p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <SkeletonText lines={1} widths={['25%']} heights={['1rem']} />
          <SkeletonText lines={1} widths={['20%']} heights={['1rem']} />
        </div>

        {/* Table Rows */}
        <div className="space-y-3 pt-1">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 w-1/3">
                <SkeletonAvatar size="1.75rem" />
                <SkeletonText lines={1} widths={['60%']} heights={['0.875rem']} />
              </div>
              <SkeletonBox height="1.5rem" width="20%" borderRadius="0.375rem" />
              <SkeletonBox height="1.25rem" width="15%" borderRadius="9999px" />
              <SkeletonBox height="1.5rem" width="15%" borderRadius="0.375rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
