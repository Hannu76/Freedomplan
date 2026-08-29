import React, { useRef, useEffect } from 'react';
import HeroBackground from './HeroBackground';
import TrustedUniversities from './TrustedUniversities';
import ElasticStack from '../ui/elastic-stack';
import { BLACK_TEXT_URL } from '../ui';
import { motion, useInView } from 'framer-motion';
import TextAnimation from '../ui/staggerText';
import { FlipText } from '../ui/flip-text';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// TOGGLE THIS TO TEST TYPOGRAPHY VERSIONS:
// 'dynamic' = Original Mix-Blend Difference setup
// 'silver-green' = Solid #111111 text | #BFC5CC H1 highlights | #00D26A Paragraph highlights
const heroTheme = 'dynamic';

const banknoteSvg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200' width='400' height='200'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='%230052CC'/>
      <stop offset='100%' stop-color='%23002B5B'/>
    </linearGradient>
    <pattern id='pds' width='40' height='40' patternUnits='userSpaceOnUse' patternTransform='rotate(15)'>
      <text x='5' y='25' font-family='serif' font-size='24' fill='%23ffffff' opacity='0.08'>£</text>
    </pattern>
    <g id='g'>
      <path d='M0,100 Q50,0 100,50 T200,100 T300,50 T400,100' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.15'/>
      <path d='M0,100 Q50,200 100,150 T200,100 T300,150 T400,100' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.15'/>
      <circle cx='100' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.2'/>
      <circle cx='200' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.2'/>
      <circle cx='300' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.2'/>
      <path d='M0,50 Q100,-50 200,50 T400,50' fill='none' stroke='%23CF142B' stroke-width='0.6' opacity='0.15'/>
      <path d='M0,150 Q100,250 200,150 T400,150' fill='none' stroke='%23CF142B' stroke-width='0.6' opacity='0.15'/>
    </g>
  </defs>
  <rect width='400' height='200' fill='url(%23bg)'/>
  <rect width='400' height='200' fill='url(%23pds)'/>
  <use href='%23g' y='-40'/>
  <use href='%23g' y='-20'/>
  <use href='%23g' y='0'/>
  <use href='%23g' y='20'/>
  <use href='%23g' y='40'/>
  <path d='M0,0 h400 v100 Q200,0 0,100 z' fill='%23ffffff' opacity='0.08'/>
</svg>
`.trim().replace(/\n/g, '');

const graphiteSvg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200' width='400' height='200'>
  <defs>
    <linearGradient id='bgGraphite' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='%23D91F3A'/>
      <stop offset='25%' stop-color='%23C8102E'/>
      <stop offset='60%' stop-color='%239E1028'/>
      <stop offset='85%' stop-color='%236D091D'/>
      <stop offset='100%' stop-color='%234A0614'/>
    </linearGradient>
    <pattern id='pdsGraphite' width='40' height='40' patternUnits='userSpaceOnUse' patternTransform='rotate(15)'>
      <text x='5' y='25' font-family='serif' font-size='24' fill='%23ffffff' opacity='0.08'>£</text>
    </pattern>
    <g id='gGraphite'>
      <path d='M0,100 Q50,0 100,50 T200,100 T300,50 T400,100' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.2'/>
      <path d='M0,100 Q50,200 100,150 T200,100 T300,150 T400,100' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.2'/>
      <circle cx='100' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.25'/>
      <circle cx='200' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.25'/>
      <circle cx='300' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.25'/>
      <path d='M0,50 Q100,-50 200,50 T400,50' fill='none' stroke='%234A0614' stroke-width='0.8' opacity='0.4'/>
      <path d='M0,150 Q100,250 200,150 T400,150' fill='none' stroke='%234A0614' stroke-width='0.8' opacity='0.4'/>
    </g>
  </defs>
  <rect width='400' height='200' fill='url(%23bgGraphite)'/>
  <rect width='400' height='200' fill='url(%23pdsGraphite)'/>
  <use href='%23gGraphite' y='-40'/>
  <use href='%23gGraphite' y='-20'/>
  <use href='%23gGraphite' y='0'/>
  <use href='%23gGraphite' y='20'/>
  <use href='%23gGraphite' y='40'/>
  <path d='M0,0 h400 v100 Q200,0 0,100 z' fill='%23ffffff' opacity='0.12'/>
  <path d='M0,200 h400 v-70 Q200,170 0,130 z' fill='%234A0614' opacity='0.4'/>
</svg>
`.trim().replace(/\n/g, '');

const titaniumSvg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 200' width='400' height='200'>
  <defs>
    <linearGradient id='bgTitanium' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='%23D91F3A'/>
      <stop offset='25%' stop-color='%23C8102E'/>
      <stop offset='60%' stop-color='%239E1028'/>
      <stop offset='85%' stop-color='%236D091D'/>
      <stop offset='100%' stop-color='%234A0614'/>
    </linearGradient>
    <pattern id='pdsTitanium' width='40' height='40' patternUnits='userSpaceOnUse' patternTransform='rotate(15)'>
      <text x='5' y='25' font-family='serif' font-size='24' fill='%23ffffff' opacity='0.08'>£</text>
    </pattern>
    <g id='gTitanium'>
      <path d='M0,100 Q50,0 100,50 T200,100 T300,50 T400,100' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.2'/>
      <path d='M0,100 Q50,200 100,150 T200,100 T300,150 T400,100' fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.2'/>
      <circle cx='100' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.25'/>
      <circle cx='200' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.25'/>
      <circle cx='300' cy='100' r='80' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.25'/>
      <path d='M0,50 Q100,-50 200,50 T400,50' fill='none' stroke='%234A0614' stroke-width='0.8' opacity='0.4'/>
      <path d='M0,150 Q100,250 200,150 T400,150' fill='none' stroke='%234A0614' stroke-width='0.8' opacity='0.4'/>
    </g>
  </defs>
  <rect width='400' height='200' fill='url(%23bgTitanium)'/>
  <rect width='400' height='200' fill='url(%23pdsTitanium)'/>
  <use href='%23gTitanium' y='-40'/>
  <use href='%23gTitanium' y='-20'/>
  <use href='%23gTitanium' y='0'/>
  <use href='%23gTitanium' y='20'/>
  <use href='%23gTitanium' y='40'/>
  <path d='M0,0 h400 v100 Q200,0 0,100 z' fill='%23ffffff' opacity='0.12'/>
  <path d='M0,200 h400 v-70 Q200,170 0,130 z' fill='%234A0614' opacity='0.4'/>
</svg>
`.trim().replace(/\n/g, '');

const BANKNOTE_URL = `url("data:image/svg+xml;charset=utf-8,${banknoteSvg}")`;
const FINANCES_URL = `url("data:image/svg+xml;charset=utf-8,${graphiteSvg}")`;
const BEFORE_URL = `url("data:image/svg+xml;charset=utf-8,${titaniumSvg}")`;

export default function LandingPage({ dashboardComponent, onRequireAuth, onOpenPayment, isAppReady = true }) {

    // Explicit manual animation controller to guarantee play exact timing after loader fade
    const [runHeroAnim, setRunHeroAnim] = React.useState(false);
    const hasTriggered = useRef(false);
    const gsapCtxRef = useRef(null);

    const overviewRef = useRef(null);
    const dashboardRef = useRef(null);

    const isOverviewInView = useInView(overviewRef, { once: true, amount: 0.1 });
    const isDashboardInView = useInView(dashboardRef, { once: true, amount: 0.1 });

    const scrollToTrustedUniversities = () => {
        const trigger = ScrollTrigger.getById('hero-pin-trigger');
        const trusted = document.getElementById('trusted-universities-section');

        if (trigger && typeof trigger.end === 'number' && trigger.end > 0) {
            window.scrollTo({ top: trigger.end, behavior: 'smooth' });
        } else if (trusted) {
            const topPos = trusted.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({ top: topPos, behavior: 'smooth' });
        } else {
            const hero = document.getElementById('hero-section');
            const targetY = hero ? hero.offsetHeight : window.innerHeight;
            window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        // ONLY trigger after global app loader is explicitly unmounted
        if (isAppReady && !hasTriggered.current) {
            hasTriggered.current = true;
            // Instantly start the hero animation immediately after the loader finishes
            setRunHeroAnim(true);
        }
    }, [isAppReady]);

    // ─── GSAP ScrollTrigger: Premium Hero → Dashboard Transition ───────────────
    useEffect(() => {
        if (!isAppReady) return;

        // Small delay to let DOM settle after mount
        const initTimer = setTimeout(() => {
            const ctx = gsap.context(() => {
                const heroSection = document.getElementById('hero-section');
                const heroInner = document.getElementById('hero-inner');
                const trustedSection = document.getElementById('trusted-universities-section');
                const roadmap = document.getElementById('roadmap-section');

                if (!heroSection || !heroInner) return;

                // Main pinned timeline — scrubbed 1:1 to scroll, no dead zone
                const tl = gsap.timeline({
                    scrollTrigger: {
                        id: 'hero-pin-trigger',
                        trigger: heroSection,
                        start: 'top top',
                        end: '+=100%',      // one viewport-height of scroll — no excess
                        scrub: 1,           // tight scrub for immediate response
                        pin: true,
                        pinSpacing: false,  // no extra blank space after pin
                        anticipatePin: 1,
                    }
                });

                // Hero inner: scale, lift, fade, blur
                tl.to(heroInner, {
                    scale: 0.92,
                    y: -120,
                    opacity: 0.12,
                    filter: 'blur(8px)',
                    ease: 'none',
                    willChange: 'transform, opacity, filter',
                }, 0);

                // Trusted universities bridge rises simultaneously — starts at 15% so both overlap naturally
                if (trustedSection) {
                    const isMobile = window.innerWidth < 640;
                    tl.fromTo(
                        trustedSection,
                        isMobile ? { opacity: 0, y: 30 } : { opacity: 0, y: 70, scale: 0.98 },
                        isMobile ? { opacity: 1, y: 0, ease: 'none' } : { opacity: 1, y: 0, scale: 1, ease: 'none' },
                        0.15   // 15% into scroll — overlaps hero dissolve
                    );
                }

                // Floating nav appears when trusted section or roadmap is in view
                const floatingNav = document.querySelector('.floating-nav');
                if (floatingNav && (trustedSection || roadmap)) {
                    gsap.fromTo(
                        floatingNav,
                        { opacity: 0, y: -20 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.6,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: trustedSection || roadmap,
                                start: 'top 75%',
                                toggleActions: 'play none none reverse',
                            },
                        }
                    );
                }
            });

            gsapCtxRef.current = ctx;
        }, 500);

        return () => {
            clearTimeout(initTimer);
            if (gsapCtxRef.current) {
                gsapCtxRef.current.revert();
                gsapCtxRef.current = null;
            }
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, [isAppReady]);

    return (
        // overflow-x-clip prevents horizontal scroll bleed from GSAP pin spacer
        <div className="relative w-full h-full min-h-screen overflow-x-clip">

            {/* 1. HERO SECTION (100vh) — pinned by GSAP ScrollTrigger */}
            <section
                id="hero-section"
                className="relative w-full h-screen flex items-center justify-center"
            >
                <div
                    id="hero-inner"
                    className="absolute inset-0 w-screen h-screen left-[calc(-50vw+50%)] overflow-hidden"
                    style={{ transformOrigin: 'center top', willChange: 'transform, opacity, filter' }}
                >
                    <HeroBackground />

                    {/* 3D Glass Feature Panel (3 Feature Cards) — Positioned at bottom right behind 3D Ribbon (z-10) */}
                    <div className="feature-card-container feature-card absolute right-6 lg:right-16 bottom-20 lg:bottom-24 z-10 hidden xl:flex items-center gap-6 p-5 rounded-2xl bg-white/45 backdrop-blur-xl border border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] pointer-events-auto">
                        {/* Card 1: Smart Planning */}
                        <div className="feature-card flex flex-col items-center text-center px-4 py-1 border-r border-slate-200/60">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50/90 border border-blue-200/70 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm tracking-tight">Smart Planning</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Better Decisions</p>
                        </div>

                        {/* Card 2: Save More */}
                        <div className="feature-card flex flex-col items-center text-center px-4 py-1 border-r border-slate-200/60">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50/90 border border-rose-200/70 text-rose-500 flex items-center justify-center mb-3 shadow-inner">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm tracking-tight">Save More</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Stress Less</p>
                        </div>

                        {/* Card 3: Financial Freedom */}
                        <div className="feature-card flex flex-col items-center text-center px-4 py-1">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50/90 border border-indigo-200/70 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm tracking-tight">Financial Freedom</h4>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">Your Future</p>
                        </div>
                    </div>

                    {/* LAYER 2: NON-BLENDED UI (Avatars) & DYNAMIC TEXT (Isolated) */}
                    <div className="absolute inset-0 z-30 pointer-events-none px-4 sm:px-5 md:px-8 py-4 sm:py-6 md:py-8 flex flex-col justify-between">

                        {/* Top Area: Logo, Badge and Elastic Stack */}
                        <div className="flex items-center justify-between w-full gap-3">

                            {/* Top Left: Badge */}
                            <div className="pointer-events-auto bg-white/95 backdrop-blur-md shadow-xl px-5 sm:px-7 py-2.5 sm:py-3 rounded-full flex items-center justify-center relative overflow-hidden group border border-slate-100">
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-100/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                                <img
                                    src="/images/freedom-plan-logo.png"
                                    alt="FreedomPlan"
                                    className="h-8 sm:h-10 md:h-11 w-auto max-w-[220px] sm:max-w-[260px] md:max-w-[290px] object-contain"
                                />
                            </div>

                            {/* Top Right: ElasticStack Avatars & Social Proof stacked directly on hero background without glass card */}
                            <div className="pointer-events-auto flex flex-col items-center sm:items-end gap-1">
                                <ElasticStack
                                    items={[
                                        { id: "1", name: "Felix", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" },
                                        { id: "2", name: "Aneka", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka" },
                                        { id: "3", name: "Jack", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack" },
                                        { id: "4", name: "Nala", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Nala" },
                                        { id: "5", name: "Abby", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Abby" },
                                        { id: "6", name: "Max", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Max" },
                                        { id: "7", name: "Sam", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sam" },
                                        { id: "8", name: "Zoe", image: "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe" },
                                    ]}
                                    itemSize={34}
                                    overlap={8}
                                    pushForce={6}
                                    className="py-0"
                                />
                                <div className="text-white text-center sm:text-right mt-0.5">
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                                        Trusted by 500+ top student
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Middle Left: Hero Copy */}
                        <div className="max-w-[840px] mt-auto mb-10 sm:mb-16 md:mb-20 flex flex-col items-start pointer-events-auto px-1">
                            <span className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-widest mb-6 text-slate-700">
                                <span className="w-[3px] h-4 bg-blue-600 rounded-full inline-block"></span>
                                <FlipText duration={1.2} delay={0.0} loop={false}>
                                    Designed for International Students in the UK
                                </FlipText>
                            </span>

                            <motion.h1
                                initial="hidden"
                                animate={runHeroAnim ? "visible" : "hidden"}
                                variants={{
                                    visible: {
                                        transition: { staggerChildren: 0.05, delayChildren: 0.0 }
                                    }
                                }}
                                className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.2] sm:leading-[1.12] mb-6 max-w-[840px] flex flex-wrap gap-x-[0.28em] gap-y-1"
                            >
                                {/* 🔵 Blue Premium Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block"
                                    style={{ backgroundImage: BANKNOTE_URL, backgroundPosition: 'left center', backgroundSize: 'auto 150%', backgroundRepeat: 'repeat-x' }}
                                >Plan</motion.span>

                                {/* ⬛ Black Material with Red/Blue/White Banknote lines */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block hero-text-adaptive"
                                >Your</motion.span>

                                {/* 🔴 Premium Red Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block"
                                    style={{ backgroundImage: BEFORE_URL, backgroundPosition: 'left center', backgroundSize: 'auto 150%', backgroundRepeat: 'repeat-x' }}
                                >Finances</motion.span>

                                {/* ⬛ Black Material with Red/Blue/White Banknote lines */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block hero-text-adaptive"
                                >Before</motion.span>

                                {/* ⬛ Black Material with Red/Blue/White Banknote lines */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block hero-text-adaptive"
                                >Your</motion.span>

                                {/* 🔴 Premium Red Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block"
                                    style={{ backgroundImage: BEFORE_URL, backgroundPosition: 'left center', backgroundSize: 'auto 150%', backgroundRepeat: 'repeat-x' }}
                                >First Day</motion.span>

                                {/* ⬛ Black Material with Red/Blue/White Banknote lines */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block hero-text-adaptive"
                                >in the</motion.span>

                                {/* 🔵 Blue Premium Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text whitespace-nowrap inline-block"
                                    style={{ backgroundImage: BANKNOTE_URL, backgroundPosition: 'left center', backgroundSize: 'auto 150%', backgroundRepeat: 'repeat-x' }}
                                >UK.</motion.span>
                            </motion.h1>

                            <p className="text-white text-base md:text-xl font-semibold tracking-wide max-w-2xl leading-[1.6] mb-6 sm:mb-8" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.55)' }}>
                                <FlipText duration={1.5} delay={0.0} loop={false}>
                                    Master the financial essentials of studying in the UK. We simplify budgeting, banking, and daily expenses so you can arrive with confidence.
                                </FlipText>
                            </p>

                            {/* Call to Actions - Side-by-side horizontal flex row on mobile */}
                            <div className="flex flex-row items-center gap-2.5 sm:gap-4 w-full sm:w-auto my-3 sm:mt-2 flex-wrap">
                                {/* Primary Button — Start Free (Login) */}
                                <div className="relative group flex-1 sm:flex-none">
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                                    <button
                                        onClick={onRequireAuth}
                                        className="relative z-10 w-full sm:w-auto px-3.5 sm:px-8 py-2.5 sm:py-4 rounded-full font-bold sm:font-extrabold uppercase tracking-wider text-[12px] sm:text-xs transition-all bg-[#0B0F19] text-white hover:opacity-90 shadow-xl border border-slate-800 text-center flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap active:scale-95"
                                        style={{
                                            backgroundImage: BLACK_TEXT_URL,
                                            backgroundPosition: 'center',
                                            backgroundSize: 'auto 150%',
                                        }}
                                    >
                                        <span>Start Free</span>
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rounded-full opacity-90" />
                                    </button>
                                </div>

                                {/* Premium CTA — Get Instant Access */}
                                <div className="relative group flex-1 sm:flex-none">
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-[#00439F] blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                                    <button
                                        id="get-instant-access-btn"
                                        onClick={onOpenPayment}
                                        className="relative z-10 w-full sm:w-auto px-3.5 sm:px-8 py-2.5 sm:py-4 rounded-full font-bold sm:font-extrabold uppercase tracking-wider text-[12px] sm:text-xs transition-all bg-[#00439F] text-white hover:opacity-90 shadow-xl border border-blue-900/50 text-center flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap active:scale-95"
                                        style={{
                                            backgroundImage: BANKNOTE_URL,
                                            backgroundPosition: 'center',
                                            backgroundSize: 'auto 150%',
                                        }}
                                    >
                                        <span>✦ Get Instant Access</span>
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-blue-300 to-transparent rounded-full opacity-90" />
                                    </button>
                                </div>

                                {/* How It Works */}
                                <div className="relative group flex-1 sm:flex-none">
                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4/5 h-3 bg-[#B0102B] blur-md rounded-full opacity-80 group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none" />
                                    <button
                                        onClick={scrollToTrustedUniversities}
                                        className="relative z-10 w-full sm:w-auto px-3.5 sm:px-8 py-2.5 sm:py-4 rounded-full font-bold sm:font-extrabold uppercase tracking-wider text-[12px] sm:text-xs transition-all bg-[#B0102B] text-white hover:opacity-90 shadow-xl border border-red-900/50 text-center flex items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap active:scale-95"
                                        style={{
                                            backgroundImage: BEFORE_URL,
                                            backgroundPosition: 'center',
                                            backgroundSize: 'auto 150%',
                                        }}
                                    >
                                        <span>How It Works</span>
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-red-300 to-transparent rounded-full opacity-90" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="flex flex-row justify-between items-center gap-4 font-bold text-xs sm:text-sm tracking-widest uppercase pb-1 text-slate-800 w-full">
                            {/* Bottom Left: Email with custom icon */}
                            <div className="flex items-center gap-2.5">
                                <img
                                    src="/mail-icon.png"
                                    alt="Email"
                                    className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                                />
                                <span className="pointer-events-auto hover:opacity-75 transition-opacity cursor-pointer text-[11px] sm:text-xs">
                                    <FlipText duration={1.2} delay={0.0} loop={false}>
                                        freedomplan786@gmail.com
                                    </FlipText>
                                </span>
                            </div>

                            {/* Bottom Right: Call to Action Box */}
                            <div
                                onClick={scrollToTrustedUniversities}
                                className="flex items-center gap-3 text-[10px] sm:text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                <span className="hidden sm:inline">2026 Edition</span>
                                <span className="w-8 sm:w-12 h-[1px] bg-white hidden sm:block"></span>
                                <span>Scroll to explore ↓</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 2. TRUSTED BY UNIVERSITIES SECTION — Floating Trust Bridge */}
            <TrustedUniversities
                onContact={onRequireAuth}
                onOpenPayment={onOpenPayment}
            />

            {/* 3. OVERVIEW / ROADMAP SECTION — FreedomPlan System */}
            <section
                id="roadmap-section"
                ref={overviewRef}
                className="relative z-30 w-full pt-8 sm:pt-10 md:pt-12 pb-4 flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0D0F14] transition-colors"
            >
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#00D26A] mb-3">
                        FreedomPlan System
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight flex items-center justify-center gap-x-[0.25em] flex-wrap">
                        <span
                            className="font-black text-transparent bg-clip-text"
                            style={{
                                backgroundImage: BANKNOTE_URL,
                                backgroundPosition: 'left center',
                                backgroundSize: 'auto 150%',
                                backgroundRepeat: 'repeat-x'
                            }}
                        >
                            Your
                        </span>
                        <span
                            className="font-black text-transparent bg-clip-text"
                            style={{
                                backgroundImage: BEFORE_URL,
                                backgroundPosition: 'left center',
                                backgroundSize: 'auto 150%',
                                backgroundRepeat: 'repeat-x'
                            }}
                        >
                            Financial
                        </span>
                        <span
                            className="font-black text-transparent bg-clip-text"
                            style={{
                                backgroundImage: BLACK_TEXT_URL,
                                backgroundPosition: 'left center',
                                backgroundSize: 'auto 150%',
                                backgroundRepeat: 'repeat-x'
                            }}
                        >
                            Roadmap.
                        </span>
                    </h2>
                    <p className="mt-4 text-[#667085] dark:text-neutral-400 font-medium text-base md:text-lg max-w-2xl mx-auto">
                        Everything you need to predict, manage, and optimize your student finances all in one place.
                    </p>
                </div>
            </section>

            {/* 3. DASHBOARD PREVIEW SECTION */}
            <section
                ref={dashboardRef}
                className="relative z-30 w-full pt-4 pb-16 px-4 sm:px-6 mx-auto max-w-7xl"
            >
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={isDashboardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="w-full flex-1"
                >
                    {/* Render the actual Dashboard component passed in as a prop */}
                    {dashboardComponent}
                </motion.div>
            </section>

        </div>
    );
}
