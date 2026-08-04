import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonAvatar, SkeletonButton } from './SkeletonPrimitives';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 w-full" aria-busy="true">
      {/* Top Stat Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonText lines={1} widths={['45%']} heights={['0.875rem']} />
              <SkeletonAvatar size="2rem" />
            </div>
            <SkeletonBox height="2rem" width="70%" borderRadius="0.375rem" />
            <SkeletonText lines={1} widths={['60%']} heights={['0.75rem']} />
          </div>
        ))}
      </div>

      {/* Main Grid Section (2 columns on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Primary Target & Route Progress) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="skeleton-card p-6 space-y-5">
            <div className="flex justify-between items-center">
              <div className="space-y-2 w-1/2">
                <SkeletonText lines={1} widths={['80%']} heights={['1.25rem']} />
                <SkeletonText lines={1} widths={['50%']} heights={['0.875rem']} />
              </div>
              <SkeletonBox width="6rem" height="2rem" borderRadius="0.5rem" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <SkeletonText lines={1} widths={['30%']} heights={['0.875rem']} />
                <SkeletonText lines={1} widths={['20%']} heights={['0.875rem']} />
              </div>
              <SkeletonBox height="0.75rem" width="100%" borderRadius="9999px" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              {[1, 2, 3].map((k) => (
                <div key={k} className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                  <SkeletonText lines={1} widths={['60%']} heights={['0.75rem']} />
                  <SkeletonBox height="1.25rem" width="80%" borderRadius="0.25rem" />
                </div>
              ))}
            </div>
          </div>

          {/* Savings Milestone / Chart Box Skeleton */}
          <div className="skeleton-card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <SkeletonText lines={1} widths={['40%']} heights={['1.125rem']} />
              <SkeletonBox width="5rem" height="1.75rem" borderRadius="0.375rem" />
            </div>
            <SkeletonBox height="180px" width="100%" borderRadius="0.75rem" />
          </div>
        </div>

        {/* Right Column (Quick Actions & Breakdown) */}
        <div className="space-y-6">
          <div className="skeleton-card p-6 space-y-4">
            <SkeletonText lines={1} widths={['50%']} heights={['1.125rem']} />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 w-3/4">
                    <SkeletonAvatar size="1.75rem" />
                    <SkeletonText lines={1} widths={['70%']} heights={['0.875rem']} />
                  </div>
                  <SkeletonBox width="2.5rem" height="1rem" borderRadius="0.25rem" />
                </div>
              ))}
            </div>
          </div>

          <div className="skeleton-card p-6 space-y-4">
            <SkeletonText lines={1} widths={['60%']} heights={['1.125rem']} />
            <SkeletonButton height="2.75rem" />
          </div>
        </div>
      </div>
    </div>
  );
}
