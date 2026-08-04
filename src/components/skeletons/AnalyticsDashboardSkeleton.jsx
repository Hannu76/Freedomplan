import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonAvatar, SkeletonButton } from './SkeletonPrimitives';

export default function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6 w-full" aria-busy="true">
      {/* Top Banner & Control Bar */}
      <div className="skeleton-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2 w-full md:w-1/2">
          <SkeletonText lines={1} widths={['60%']} heights={['1.5rem']} />
          <SkeletonText lines={1} widths={['90%']} heights={['0.875rem']} />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <SkeletonBox width="6rem" height="2.5rem" borderRadius="0.5rem" />
          <SkeletonButton width="8rem" height="2.5rem" />
        </div>
      </div>

      {/* Analytics KPI Metrics Cards (4 tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonText lines={1} widths={['50%']} heights={['0.875rem']} />
              <SkeletonAvatar size="1.75rem" />
            </div>
            <SkeletonBox height="2.25rem" width="75%" borderRadius="0.375rem" />
            <SkeletonText lines={1} widths={['65%']} heights={['0.75rem']} />
          </div>
        ))}
      </div>

      {/* Main Charts & Projection Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Projection Line / Bar Chart Skeleton (2 cols) */}
        <div className="lg:col-span-2 skeleton-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1 w-1/2">
              <SkeletonText lines={1} widths={['70%']} heights={['1.25rem']} />
              <SkeletonText lines={1} widths={['45%']} heights={['0.875rem']} />
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((k) => (
                <SkeletonBox key={k} width="3rem" height="1.75rem" borderRadius="0.375rem" />
              ))}
            </div>
          </div>

          {/* Chart Canvas Skeleton */}
          <div className="h-64 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {[40, 65, 50, 85, 70, 90, 60, 75, 95, 80, 55, 100].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <SkeletonBox height={`${h}%`} width="100%" borderRadius="0.25rem" />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <SkeletonText lines={1} widths={['30%']} heights={['0.75rem']} />
            <SkeletonText lines={1} widths={['30%']} heights={['0.75rem']} />
          </div>
        </div>

        {/* Breakdown Donut / Pie Skeleton (1 col) */}
        <div className="skeleton-card p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <SkeletonText lines={1} widths={['60%']} heights={['1.25rem']} />
            <SkeletonText lines={1} widths={['80%']} heights={['0.875rem']} />
          </div>

          {/* Donut Circle Skeleton */}
          <div className="flex justify-center items-center py-4">
            <SkeletonAvatar size="10rem" />
          </div>

          {/* Legend Items */}
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((m) => (
              <div key={m} className="flex justify-between items-center">
                <div className="flex items-center gap-2 w-1/2">
                  <SkeletonAvatar size="0.75rem" />
                  <SkeletonText lines={1} widths={['70%']} heights={['0.75rem']} />
                </div>
                <SkeletonText lines={1} widths={['30%']} heights={['0.75rem']} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
