import React from "react";
import HeroBackground from "./HeroBackground";

export default function Hero() {
  return (
    <section className="relative overflow-hidden min-h-screen">

      <HeroBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-32">

        <h1 className="text-7xl font-bold text-slate-900">
          Your Hero Title
        </h1>

        <p className="mt-8 max-w-xl text-slate-600 text-xl">
          Beautiful premium hero section built entirely using React and
          Tailwind.
        </p>

      </div>

    </section>
  );
}
