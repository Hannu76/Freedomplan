import React from 'react';
import {
  GraduationCap, Compass, Landmark, PiggyBank,
  ArrowRight, ShieldCheck, HeartHandshake, CheckCircle2, Lock, ArrowLeft
} from 'lucide-react';
import { BANKNOTE_URL } from '../ui';

/**
 * AboutSection
 * Displayed exclusively inside the dedicated About Us view/page.
 * NEVER shown on the homepage or overview sections.
 */
export default function AboutSection({ onOpenLogin, onOpenRegister, onOpenAdmin, onBackToHome }) {
  return (
    <div className="w-full max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home Overview</span>
        </button>
      )}

      <div className="bg-white dark:bg-[#0B132B]/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 sm:p-10 md:p-14 shadow-xl space-y-12">
        
        {/* Header Badge & Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>About FreedomPlan</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#161C2D] dark:text-white">
            Supporting Students Planning Their UK Journey
          </h1>
          <p className="text-sm sm:text-base text-[#667085] dark:text-slate-400 leading-relaxed">
            FreedomPlan is committed to supporting students who are planning their future journey to the United Kingdom. Alongside our financial planning tools and Premium features, we also provide additional guidance and support for students preparing for different stages of their UK journey.
          </p>
        </div>

        {/* Introduction Narrative */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            We understand that every student's situation is different. Some students are only beginning their planning, while others may already be preparing their documents, finances, accommodation, or future life in the United Kingdom.
          </p>
        </div>

        {/* Detailed Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#161C2D] dark:text-white">Student Processing Support</h3>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              For students planning to move to the UK, we provide additional support throughout their planning and processing journey. Our approach is designed to help students better understand the different stages involved and organize their plans in a structured way.
            </p>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              We aim to provide useful guidance for students who need support while preparing for their next steps toward the United Kingdom.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Landmark className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#161C2D] dark:text-white">Financial Planning & Student Support</h3>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              Financial preparation can be particularly challenging for students and their families. FreedomPlan provides tools and resources that can help students better understand their financial situation and prepare for future expenses.
            </p>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              Our Premium users may also receive access to additional features, planning tools, resources, and special offers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#161C2D] dark:text-white">Supporting Middle-Class Students</h3>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              We especially understand the challenges faced by students from middle-class families who are planning an international future. Proper planning, financial awareness, and access to the right information can make a significant difference.
            </p>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              Our goal is to help students approach their journey with greater clarity and confidence.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
              <PiggyBank className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-[#161C2D] dark:text-white">A Structured Journey</h3>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              Students can receive guidance and information according to their individual stage of planning. We aim to organize useful resources in a structured format so that students can better understand what they need to consider during their journey.
            </p>
            <p className="text-xs text-[#667085] dark:text-slate-400 leading-relaxed">
              Plan before you arrive. Understand before you spend. Prepare before you commit.
            </p>
          </div>
        </div>

        {/* Educational & Planning Purpose Notice */}
        <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Educational & Planning Purpose Notice</span>
          </div>
          <p>
            FreedomPlan is an educational technology and financial tracking software platform. Calculations, estimates, projections, and examples are provided for personal educational and planning purposes.
          </p>
        </div>

        {/* ── PLACEMENT: CUSTOMER LOGIN BUTTON AT THE BOTTOM OF THE ABOUT SECTION ── */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-[#161C2D] dark:text-white">
              Ready to Access Your Freedom Financial Plan?
            </h3>
            <p className="text-xs text-[#667085] dark:text-slate-400 max-w-md">
              Sign in to your account or register to save your financial roadmaps and track your progress.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
            {/* Primary Login Button */}
            <button
              onClick={onOpenLogin}
              className="relative w-full sm:w-auto px-8 py-3.5 rounded-full font-extrabold uppercase tracking-wider text-xs text-white transition-all bg-[#001C44] hover:bg-[#002D6E] shadow-xl border border-blue-900/50 flex items-center justify-center gap-2 active:scale-95"
              style={{
                backgroundImage: BANKNOTE_URL,
                backgroundPosition: 'center',
                backgroundSize: 'auto 150%',
              }}
            >
              <span>Student & Customer Log In</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Create Free Account */}
            <button
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full font-extrabold uppercase tracking-wider text-xs text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
            >
              Create Free Account
            </button>
          </div>

          {/* Admin Login Link */}
          <div className="pt-2">
            <button
              onClick={onOpenAdmin}
              className="text-[11px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 mx-auto"
            >
              <Lock className="w-3 h-3" />
              <span>Administrator Portal Login</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
