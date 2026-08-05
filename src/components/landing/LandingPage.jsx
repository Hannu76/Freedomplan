import React, { useRef, useEffect } from 'react';
import LiquidGlassBackground from './LiquidGlassBackground';
import ElasticStack from '../ui/elastic-stack';
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

export default function LandingPage({ dashboardComponent, onRequireAuth, isAppReady = true }) {

    // Explicit manual animation controller to guarantee play exact timing after loader fade
    const [runHeroAnim, setRunHeroAnim] = React.useState(false);
    const hasTriggered = useRef(false);
    const gsapCtxRef = useRef(null);

    const overviewRef = useRef(null);
    const dashboardRef = useRef(null);

    const isOverviewInView = useInView(overviewRef, { once: true, amount: 0.1 });
    const isDashboardInView = useInView(dashboardRef, { once: true, amount: 0.1 });

    useEffect(() => {
        // ONLY trigger after global app loader is explicitly unmounted
        if (isAppReady && !hasTriggered.current) {
            hasTriggered.current = true;
            // Introduce exactly 300ms pause after loader is gone for visual polish
            setTimeout(() => {
                setRunHeroAnim(true);
            }, 300);
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
                const heroRibbon = document.querySelector('.hero-ribbon');
                const roadmap = document.getElementById('roadmap-section');

                if (!heroSection || !heroInner || !roadmap) return;

                // Main pinned timeline — scrubbed 1:1 to scroll, no dead zone
                const tl = gsap.timeline({
                    scrollTrigger: {
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

                // Ribbon fades slightly earlier than the rest
                if (heroRibbon) {
                    tl.to(heroRibbon, {
                        opacity: 0.15,
                        ease: 'none',
                    }, 0);
                }

                // Roadmap rises simultaneously — starts at 15% so both overlap naturally
                tl.fromTo(
                    roadmap,
                    { opacity: 0, y: 80, scale: 0.98 },
                    { opacity: 1, y: 0, scale: 1, ease: 'none' },
                    0.15   // 15% into scroll — overlaps hero dissolve
                );

                // Floating nav appears when roadmap is 25% visible
                const floatingNav = document.querySelector('.floating-nav');
                if (floatingNav) {
                    gsap.fromTo(
                        floatingNav,
                        { opacity: 0, y: -20 },
                        {
                            opacity: 1,
                            y: 0,
                            duration: 0.6,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: roadmap,
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
                    <div className="absolute inset-0 w-full h-full bg-[#FFFFFF]" />

                    {/* Ribbon wrapper — targeted by GSAP separately */}
                    <div className="hero-ribbon absolute inset-0 w-full h-full">
                        <LiquidGlassBackground />
                    </div>

                    {/* LAYER 2: NON-BLENDED UI (Avatars) & DYNAMIC TEXT (Isolated) */}
                    <div className="absolute inset-0 pointer-events-none p-6 md:p-12 flex flex-col justify-between">

                        {/* Top Area: Logo and Elastic Stack */}
                        <div className="flex items-start justify-between w-full">

                            {/* Top Left: Logo (Split Blend) */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-baseline">
                                    <span className="font-sans font-bold text-[19px] tracking-tight mix-blend-difference text-white">
                                        Freedom
                                    </span>
                                    <span className="font-sans font-bold text-[19px] tracking-tight text-[#93E33C]">
                                        plan
                                    </span>
                                </div>
                                <span className="mix-blend-difference text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full border border-white">
                                    UK Student Edition
                                </span>
                            </div>

                            {/* Top Right: ElasticStack & Social Proof (Colorful, Unblended Avatars, Blended Text) */}
                            <div className="pointer-events-auto flex flex-col items-end gap-3 -mt-[10px]">
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
                                    itemSize={44}
                                    overlap={18}
                                    pushForce={10}
                                    className="py-0"
                                />
                                <div className="mix-blend-difference text-white text-right pr-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">
                                        Trusted by<br /> 500+ top students
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Middle Left: Hero Copy */}
                        <div className="max-w-4xl mt-auto mb-16 md:mb-24 flex flex-col items-start pointer-events-auto">
                            <span className="mix-blend-difference text-xs md:text-sm font-bold uppercase tracking-widest mb-6 border-l-2 pl-4 border-white text-neutral-300">
                                <FlipText duration={2.2} delay={0.1} loop={false}>
                                    Designed for International Students in the UK
                                </FlipText>
                            </span>

                            <motion.h1
                                initial="hidden"
                                animate={runHeroAnim ? "visible" : "hidden"}
                                variants={{
                                    visible: {
                                        transition: { staggerChildren: 0.1, delayChildren: 0.2 }
                                    }
                                }}
                                className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] mb-6 max-w-[900px] flex flex-wrap gap-x-[0.3em]"
                            >
                                {/* 🔵 Blue Premium Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: BANKNOTE_URL,
                                        backgroundPosition: 'left center',
                                        backgroundSize: 'auto 150%',
                                        backgroundRepeat: 'repeat-x'
                                    }}
                                >Plan</motion.span>

                                {/* ⬛ Standard Rich Black */}
                                <motion.span variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }} className="mix-blend-difference text-white">Your</motion.span>

                                {/* 🔴 Premium Red Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: BEFORE_URL,
                                        backgroundPosition: 'left center',
                                        backgroundSize: 'auto 150%',
                                        backgroundRepeat: 'repeat-x'
                                    }}
                                >Finances</motion.span>

                                {/* ⬛ Standard Rich Black */}
                                <motion.span variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }} className="mix-blend-difference text-white">Before</motion.span>

                                {/* ⬛ Standard Rich Black */}
                                <motion.span variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }} className="mix-blend-difference text-white">Your</motion.span>

                                {/* 🔴 Premium Red Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: BEFORE_URL,
                                        backgroundPosition: 'left center',
                                        backgroundSize: 'auto 150%',
                                        backgroundRepeat: 'repeat-x'
                                    }}
                                >First Day</motion.span>

                                {/* ⬛ Standard Rich Black */}
                                <motion.span variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }} className="mix-blend-difference text-white">in the</motion.span>

                                {/* 🔵 Blue Premium Material */}
                                <motion.span
                                    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
                                    className="font-extrabold text-transparent bg-clip-text"
                                    style={{
                                        backgroundImage: BANKNOTE_URL,
                                        backgroundPosition: 'left center',
                                        backgroundSize: 'auto 150%',
                                        backgroundRepeat: 'repeat-x'
                                    }}
                                >UK.</motion.span>
                            </motion.h1>

                            <p className="mix-blend-difference text-white text-base md:text-xl font-medium tracking-wide max-w-2xl leading-relaxed mb-10">
                                <FlipText duration={2.5} delay={0.3} loop={false}>
                                    Master the financial essentials of studying in the UK. We simplify budgeting, banking, and daily expenses so you can arrive with confidence.
                                </FlipText>
                            </p>

                            {/* Call to Actions */}
                            <div className="mix-blend-difference flex flex-col sm:flex-row items-center gap-4">
                                <button
                                    onClick={onRequireAuth}
                                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-colors bg-white text-black hover:bg-neutral-200"
                                >
                                    Start Your Free Plan
                                </button>
                                <button
                                    onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                                    className="w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-colors border border-white text-white hover:bg-white/10"
                                >
                                    See How It Works
                                </button>
                            </div>
                        </div>

                        {/* Bottom Row (Blended) */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 font-bold text-sm tracking-widest uppercase pb-2 mix-blend-difference text-white">
                            {/* Bottom Left: Email with custom icon */}
                            <div className="flex items-center gap-3">
                                <img
                                    src="/mail-icon.png"
                                    alt="Email"
                                    className="w-6 h-6 object-contain flex-shrink-0"
                                    style={{ filter: 'invert(1) brightness(2)', imageRendering: 'crisp-edges' }}
                                />
                                <span className="pointer-events-auto hover:opacity-75 transition-opacity cursor-pointer">
                                    <FlipText duration={2.2} delay={0.5} loop={false}>
                                        freedomplan786@gmail.com
                                    </FlipText>
                                </span>
                            </div>

                            {/* Bottom Right: Call to Action Box */}
                            <div className="text-right flex items-center gap-4">
                                <span>2026 Edition</span>
                                <span className="w-12 h-[1px] bg-white hidden md:block"></span>
                                <span>Scroll to explore ↓</span>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 2. OVERVIEW / ABOUT SECTION — rises as Hero dissolves, positioned directly behind */}
            <section
                id="roadmap-section"
                ref={overviewRef}
                className="relative z-30 w-full pt-20 pb-4 flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0D0F14] transition-colors"
            >
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-[#00D26A] mb-3">
                        FreedomPlan System
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#161C2D] dark:text-white tracking-tight leading-tight">
                        Your Financial Roadmap.
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
