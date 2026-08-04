import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonAvatar, SkeletonButton } from './SkeletonPrimitives';

export default function AccountsManagerSkeleton() {
  return (
    <div className="space-y-6 w-full" aria-busy="true">
      {/* Header & Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card p-4 space-y-2">
            <SkeletonText lines={1} widths={['60%']} heights={['0.75rem']} />
            <SkeletonBox height="1.75rem" width="80%" borderRadius="0.375rem" />
          </div>
        ))}
      </div>

      {/* Filter & Action Bar Skeleton */}
      <div className="skeleton-card p-4 flex justify-between items-center">
        <div className="flex gap-2">
          {[1, 2, 3].map((k) => (
            <SkeletonBox key={k} width="5rem" height="2.25rem" borderRadius="0.5rem" />
          ))}
        </div>
        <SkeletonButton width="9rem" height="2.25rem" />
      </div>

      {/* Accounts List Section (Cards Grid) */}
      <div className="space-y-4">
        <SkeletonText lines={1} widths={['30%']} heights={['1.25rem']} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="skeleton-card p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <SkeletonText lines={1} widths={['80%']} heights={['1.125rem']} />
                  <div className="flex gap-2">
                    <SkeletonBox width="3.5rem" height="1.25rem" borderRadius="9999px" />
                    <SkeletonBox width="4rem" height="1.25rem" borderRadius="9999px" />
                  </div>
                </div>
                <SkeletonAvatar size="2rem" />
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <SkeletonText lines={1} widths={['40%']} heights={['0.75rem']} />
                <SkeletonBox height="1.5rem" width="60%" borderRadius="0.25rem" />
              </div>

              <div className="flex justify-between items-center pt-2">
                <SkeletonText lines={1} widths={['50%']} heights={['0.75rem']} />
                <div className="flex gap-2">
                  <SkeletonBox width="2rem" height="2rem" borderRadius="0.375rem" />
                  <SkeletonBox width="2rem" height="2rem" borderRadius="0.375rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
