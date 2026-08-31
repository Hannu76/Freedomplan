import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ onComplete }) {
  useEffect(() => {
    // Eagerly preload the hero background image into browser memory during loader
    const bgDesktop = new Image();
    bgDesktop.src = '/onboard/remote/hero-background-new.webp';
    const bgMobile = new Image();
    bgMobile.src = '/onboard/remote/hero-background-mobile.webp';

    // Snappy loading screen duration for ultra-smooth transition
    const timer = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="loading-container">
      <div className="wrapper-grid freedom-grid">
        {['F', 'R', 'E', 'E', 'D', 'O', 'M'].map((letter, i) => (
          <div className="cube" key={`freedom-${i}`} style={{ animationDelay: `${i * 0.2}s` }}>
            <div className="face face-front" style={{ animationDelay: `${i * 0.2}s` }}>{letter}</div>
            <div className="face face-back" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-right" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-left" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-top" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-bottom" style={{ animationDelay: `${i * 0.2}s` }}></div>
          </div>
        ))}
      </div>

      <div className="wrapper-grid plan-grid">
        {['P', 'L', 'A', 'N'].map((letter, i) => (
          <div className="cube" key={`plan-${i}`} style={{ animationDelay: `${i * 0.2}s` }}>
            <div className="face face-front" style={{ animationDelay: `${i * 0.2}s` }}>{letter}</div>
            <div className="face face-back" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-right" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-left" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-top" style={{ animationDelay: `${i * 0.2}s` }}></div>
            <div className="face face-bottom" style={{ animationDelay: `${i * 0.2}s` }}></div>
          </div>
        ))}
      </div>

      <div className="loading-tagline animate-fade-in-up">
        Empowering your financial future
      </div>
      
      <div className="loading-mobile-note animate-fade-in-up">
        For the best experience, please open in desktop site
      </div>
    </div>
  );
}
