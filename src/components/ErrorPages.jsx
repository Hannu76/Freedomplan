import React from 'react';

export function AnimatedFace() {
    return (
        <div className="my-custom-face-container">
            <svg className="face" viewBox="0 0 320 380">
                <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="25">
                    <g className="face__eyes" transform="translate(0,112.5)">
                        <g transform="translate(15,0)">
                            <polyline className="face__eye-lid" points="37,0 0,120 75,120"></polyline>
                            <polyline className="face__pupil" points="55,120 55,155" strokeDasharray="35 35"></polyline>
                        </g>
                        <g transform="translate(230,0)">
                            <polyline className="face__eye-lid" points="37,0 0,120 75,120"></polyline>
                            <polyline className="face__pupil" points="55,120 55,155" strokeDasharray="35 35"></polyline>
                        </g>
                    </g>
                    <rect className="face__nose" x="132.5" y="112.5" rx="4" ry="4" width="55" height="155"></rect>
                    <g transform="translate(65,334)" strokeDasharray="102 102">
                        <path className="face__mouth-left" d="M 0 30 C 0 30 40 0 95 0"></path>
                        <path className="face__mouth-right" d="M 95 0 C 150 0 190 30 190 30"></path>
                    </g>
                </g>
            </svg>
        </div>
    );
}

export function NotFoundPage({ onGoHome }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in w-full max-w-3xl mx-auto">
            <AnimatedFace />
            <h1 className="text-4xl font-extrabold text-[#161C2D] mt-8 mb-4">404 - Page Not Found</h1>
            <p className="text-neutral-500 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
                The page you're looking for doesn't exist or may have been moved.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={onGoHome}
                    className="px-6 py-3 rounded-[12px] bg-[#F9FBFD] border border-[#EEF2F7] text-[#161C2D] font-bold hover:bg-[#EEF2F7] transition-colors"
                >
                    Go Back
                </button>
                <button
                    onClick={onGoHome}
                    className="px-6 py-3 rounded-[12px] bg-[#B6F36A] text-[#161C2D] font-bold shadow-[0_4px_14px_rgba(182,243,106,0.4)] hover:shadow-lg transition-all"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}

export function MaintenancePage() {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in w-full max-w-3xl mx-auto">
            <AnimatedFace />
            <h1 className="text-4xl font-extrabold text-[#161C2D] mt-8 mb-4">We're Improving Your Experience</h1>
            <p className="text-neutral-500 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                We're currently working on a new update to make the application even better. Some features may be temporarily unavailable. We'll be back shortly. Thank you for your patience.
            </p>

            <div className="flex items-center gap-2 mb-10 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full font-bold text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                ⚙️ Installing Latest Update...
            </div>

            <div className="flex items-center gap-8">
                <a href="mailto:support@example.com" className="flex items-center gap-2 text-neutral-500 hover:text-[#161C2D] transition-colors font-bold">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-neutral-500 hover:text-[#161C2D] transition-colors font-bold">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.46 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                    Instagram
                </a>
            </div>
        </div>
    );
}
