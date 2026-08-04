import React, { useState } from 'react';
import './Skeleton.css';

/**
 * Base Skeleton Box Primitive
 */
export const SkeletonBox = React.memo(({ width, height, borderRadius, className = '', style = {} }) => {
  const customStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(borderRadius ? { borderRadius } : {}),
    ...style,
  };

  return (
    <div
      className={`skeleton-base skeleton-box ${className}`}
      style={customStyle}
      aria-hidden="true"
    />
  );
});

/**
 * Skeleton Circle (Avatar/Icon)
 */
export const SkeletonAvatar = React.memo(({ size = '2.5rem', className = '', style = {} }) => {
  return (
    <div
      className={`skeleton-base skeleton-circle ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    />
  );
});

/**
 * Multi-line Skeleton Text Component
 */
export const SkeletonText = React.memo(({ lines = 1, heights = [], widths = [], className = '', style = {} }) => {
  const lineArray = Array.from({ length: lines });

  return (
    <div className={`w-full ${className}`} style={style} aria-hidden="true">
      {lineArray.map((_, index) => {
        const lineH = heights[index] || '1rem';
        const lineW = widths[index] || (index === lines - 1 && lines > 1 ? '70%' : '100%');

        return (
          <div
            key={index}
            className="skeleton-base skeleton-text"
            style={{ height: lineH, width: lineW }}
          />
        );
      })}
    </div>
  );
});

/**
 * Skeleton Button Primitive
 */
export const SkeletonButton = React.memo(({ width = '100%', height = '2.5rem', className = '', style = {} }) => {
  return (
    <div
      className={`skeleton-base skeleton-button ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
});

/**
 * Skeleton Image Component (displays skeleton until image is fully loaded)
 */
export const SkeletonImage = ({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  width,
  height = '200px',
  borderRadius = '0.75rem',
  onLoad,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (e) => {
    setIsLoaded(true);
    if (onLoad) onLoad(e);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: width || '100%', height, borderRadius }}
      aria-busy={!isLoaded}
    >
      {!isLoaded && (
        <SkeletonBox
          width="100%"
          height="100%"
          borderRadius={borderRadius}
          className="absolute inset-0 z-10"
        />
      )}
      
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100 content-fade-in' : 'opacity-0'
          } ${imgClassName}`}
          {...props}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs rounded-lg">
          Failed to load image
        </div>
      )}
    </div>
  );
};
