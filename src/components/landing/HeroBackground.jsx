import React from 'react';

const curves = Array.from({ length: 8 });

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      {/* Desktop Background (md and above) */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat hidden md:block"
        style={{ backgroundImage: "url('/onboard/remote/hero-background-new.png')" }}
      />

      {/* Mobile Background (below md) */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat md:hidden"
        style={{ backgroundImage: "url('/onboard/remote/hero-background-mobile.png')" }}
      />

      {/* Dark gradient overlay — left side for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent" />
    </div>
  );
}
