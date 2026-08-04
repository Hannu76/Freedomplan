import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonAvatar, SkeletonButton } from './SkeletonPrimitives';

export default function LoanTrackerSkeleton() {
  return (
    <div className="space-y-6 w-full" aria-busy="true">
      {/* Top Banner Stats (2 tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton-card p-5 space-y-3">
            <SkeletonText lines={1} widths={['45%']} heights={['0.875rem']} />
            <SkeletonBox height="2.25rem" width="70%" borderRadius="0.375rem" />
            <SkeletonText lines={1} widths={['60%']} heights={['0.75rem']} />
          </div>
        ))}
      </div>

      {/* Schedule Table Skeleton */}
      <div className="skeleton-card p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1 w-1/2">
            <SkeletonText lines={1} widths={['60%']} heights={['1.25rem']} />
            <SkeletonText lines={1} widths={['80%']} heights={['0.875rem']} />
          </div>
          <SkeletonBox width="10rem" height="2rem" borderRadius="9999px" />
        </div>

        {/* Table Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <div key={row} className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <SkeletonText lines={1} widths={['20%']} heights={['0.875rem']} />
              <SkeletonBox height="1.25rem" width="18%" borderRadius="0.25rem" />
              <SkeletonBox height="1.25rem" width="18%" borderRadius="0.25rem" />
              <SkeletonBox height="1.5rem" width="22%" borderRadius="0.375rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
