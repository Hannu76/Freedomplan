import React from 'react';

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#0B1E33]">
      {/* High-Performance Picture Element with Eager Preloading & WebP */}
      <picture className="absolute inset-0 w-full h-full">
        <source
          media="(max-width: 767px)"
          type="image/webp"
          srcSet="/onboard/remote/hero-background-mobile.webp"
        />
        <source
          media="(max-width: 767px)"
          type="image/jpeg"
          srcSet="/onboard/remote/hero-background-mobile.jpg"
        />
        <source
          media="(min-width: 768px)"
          type="image/webp"
          srcSet="/onboard/remote/hero-background-new.webp"
        />
        <source
          media="(min-width: 768px)"
          type="image/jpeg"
          srcSet="/onboard/remote/hero-background-new.jpg"
        />
        <img
          src="/onboard/remote/hero-background-new.webp"
          alt="FreedomPlan UK Hero Background"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover object-center scale-[1.01]"
        />
      </picture>

      {/* Dark gradient overlay — left side for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />
    </div>
  );
}

