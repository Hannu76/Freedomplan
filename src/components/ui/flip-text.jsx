"use client";

import React, { useMemo } from "react";

// Inlined cn utility — no external dependency needed
function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}


export function FlipText({
    className,
    children,
    duration = 2.2,
    delay = 0,
    loop = false,
    separator = " ",
    together = false,
}) {
    const textStr = typeof children === "string" ? children : String(children || "");

    const words = useMemo(() => textStr.split(separator), [textStr, separator]);
    const totalChars = textStr.length;

    // Calculate character index for each position
    const getCharIndex = (wordIndex, charIndex) => {
        let index = 0;
        for (let i = 0; i < wordIndex; i++) {
            index += words[i].length + (separator === " " ? 1 : separator.length);
        }
        return index + charIndex;
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes v-flip-loop {
                    0%, 20% { transform: rotateX(0deg); opacity: 1; }
                    25% { transform: rotateX(-90deg); opacity: 0; }
                    30% { transform: rotateX(90deg); opacity: 0; }
                    35%, 100% { transform: rotateX(0deg); opacity: 1; }
                }
                @keyframes v-flip-once {
                    0% { transform: rotateX(-90deg); opacity: 0; }
                    100% { transform: rotateX(0deg); opacity: 1; }
                }
            `}} />
            <div
                className={cn(
                    "flip-text-wrapper inline-block leading-none",
                    className
                )}
                style={{ perspective: "1000px" }}
            >
                {words.map((word, wordIndex) => {
                    const chars = word.split("");

                    return (
                        <span
                            key={wordIndex}
                            className="word inline-block whitespace-nowrap"
                            style={{ transformStyle: "preserve-3d" }}
                        >
                            {chars.map((char, charIndex) => {
                                const currentGlobalIndex = getCharIndex(wordIndex, charIndex);

                                // Calculate delay - if together, use same delay for all
                                let calculatedDelay = delay;
                                if (!together && totalChars > 0) {
                                    const normalizedIndex = currentGlobalIndex / totalChars;
                                    const sineValue = Math.sin(normalizedIndex * (Math.PI / 2));
                                    calculatedDelay = sineValue * (duration * 0.25) + delay;
                                }

                                return (
                                    <span
                                        key={charIndex}
                                        className="flip-char inline-block relative"
                                        data-char={char}
                                        style={{
                                            "--flip-duration": `${duration}s`,
                                            "--flip-delay": `${calculatedDelay}s`,
                                            animationName: loop ? 'v-flip-loop' : 'v-flip-once',
                                            animationDuration: `${duration}s`,
                                            animationDelay: `${calculatedDelay}s`,
                                            animationIterationCount: loop ? 'infinite' : '1',
                                            animationFillMode: 'both',
                                            animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                            transformStyle: "preserve-3d",
                                        }}
                                    >
                                        {char}
                                    </span>
                                );
                            })}
                            {separator === " " && wordIndex < words.length - 1 && (
                                <span className="whitespace inline-block">&nbsp;</span>
                            )}
                            {separator !== " " && wordIndex < words.length - 1 && (
                                <span className="separator inline-block">{separator}</span>
                            )}
                        </span>
                    );
                })}
            </div>
        </>
    );
}

export default FlipText;
