import React from 'react';

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Desktop Background (md and above) */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat hidden md:block"
        style={{
          backgroundImage: "url('/onboard/remote/hero-background-new.webp'), url('/onboard/remote/hero-background-new.png')",
        }}
      />

      {/* Mobile Background (below md) */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat md:hidden"
        style={{
          backgroundImage: "url('/onboard/remote/hero-background-mobile.webp'), url('/onboard/remote/hero-background-mobile.png')",
        }}
      />

      {/* Subtle soft gradient overlay for crisp text contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/15 pointer-events-none" />
    </div>
  );
}


