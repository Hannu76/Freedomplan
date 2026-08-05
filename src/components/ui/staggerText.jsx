import { motion, useAnimation, useInView } from "framer-motion";
import * as React from "react";

export default function TextAnimation({
    children,
    delay = 0,
    divideBy = "word",
    className = "",
    isReady = true
}) {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-5%" });
    const controls = useAnimation();

    React.useEffect(() => {
        if (isInView && isReady) {
            controls.start("visible");
        }
    }, [isInView, isReady, controls]);

    // If children isn't a string (e.g. contains nested spans), we can't easily auto-stagger it without complex parsing.
    // We'll provide a fallback block-level stagger if it's an array, or just render it directly so we don't break the app.
    if (typeof children !== "string") {
        // If it's mixed React nodes (like the H1 with bank-note SVG spans), we wrap it in a simple fade-up
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 24 }}
                animate={controls}
                variants={{
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: delay, ease: [0.22, 1, 0.36, 1] } }
                }}
                className={`inline-block ${className}`}
            >
                {children}
            </motion.div>
        );
    }

    const elements = divideBy === "word" ? children.split(" ") : children.split("");

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: divideBy === "word" ? 0.08 : 0.03, delayChildren: delay },
        },
    };

    const child = {
        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
            },
        },
        hidden: {
            opacity: 0,
            y: 24,
            filter: "blur(4px)",
        },
    };

    return (
        <motion.div
            ref={ref}
            variants={container}
            initial="hidden"
            animate={controls}
            className={`inline-block ${className}`}
        >
            {elements.map((word, index) => (
                <motion.span
                    variants={child}
                    style={{ display: "inline-block", paddingRight: divideBy === "word" ? "0.25em" : "0", whiteSpace: "pre" }}
                    key={index}
                >
                    {word === " " ? "\u00A0" : word}
                </motion.span>
            ))}
        </motion.div>
    );
}
