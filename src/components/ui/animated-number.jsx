"use client"

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

function AnimatedNumber({ value, className }) {
    const stringValue = value !== undefined && value !== null ? value.toString() : ""
    return (
        <span className={cn("inline-flex items-center leading-none select-none overflow-visible", className)}>
            {stringValue.split("").map((digit, index) => (
                <SingleNumberHolder key={`${index}-${digit}`} value={digit} index={index} />
            ))}
        </span>
    )
}

function SingleNumberHolder({ value }) {
    return (
        <span className="inline-flex items-center justify-center relative overflow-visible align-baseline leading-none">
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={value}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-flex items-center justify-center leading-none"
                >
                    {value}
                </motion.span>
            </AnimatePresence>
        </span>
    )
}

// Score-style animated number with color feedback
function AnimatedScore({ value, duration = 0.2, className }) {
    const prevValueRef = useRef(value)

    useEffect(() => {
        prevValueRef.current = value
    }, [value])

    const colors = {
        negative: "#37ff1a",
        positive: "#ff1a4b",
        neutral: "#fff"
    }

    const transforVal = 80
    const forwards = {
        init: { y: transforVal * -1, opacity: 0, scale: 0.5, color: colors.negative },
        animate: {
            y: 0,
            opacity: 1,
            scale: [1.7, 1],
            color: [colors.negative, colors.negative, colors.neutral],
            transition: { duration: 0.4, times: [0, 0.7, 1], color: { times: [0, 0.75, 0.9] } },
        },
        exit: {
            y: transforVal,
            opacity: 0,
            scale: 0.5,
            color: colors.positive
        },
    }

    const backwards = {
        init: { y: transforVal, opacity: 0, scale: 0.5, color: colors.positive },
        animate: {
            y: 0,
            opacity: 1,
            scale: [1.7, 1],
            color: [colors.positive, colors.positive, colors.neutral],
            transition: { duration: 0.4, times: [0, 0.7, 1], color: { times: [0, 0.75, 0.9] } },
        },
        exit: {
            y: transforVal * -1,
            opacity: 0,
            scale: 0.5,
            color: colors.negative
        }
    }

    const variants = value >= prevValueRef.current ? forwards : backwards
    const direction = value >= prevValueRef.current ? "forwards" : "backwards"

    return (
        <div className={cn("relative flex justify-center items-center py-1 px-2 w-full rounded-md overflow-visible", className)}>
            <motion.div layout="size" className='w-fit flex justify-center items-center overflow-visible'>
                {value.toString().split("").map((number, index) => (
                    <ScoreContainer
                        direction={direction}
                        duration={duration}
                        variants={variants}
                        number={number}
                        key={index}
                    />
                ))}
            </motion.div>
        </div>
    )
}

function ScoreContainer({ number, variants, duration = 0.7, direction }) {
    const cached = React.useMemo(() => (
        <div className='relative overflow-visible'>
            <AnimatePresence mode='popLayout'>
                <motion.div
                    animate="animate"
                    className='flex justify-center items-center overflow-visible'
                    initial="init"
                    exit="exit"
                    variants={variants}
                    key={number.toString()}
                    layout="size"
                    transition={{ duration, ease: "backInOut" }}
                >
                    {number}
                </motion.div>
            </AnimatePresence>
        </div>
    ), [number, direction, variants, duration])

    return <React.Fragment>{cached}</React.Fragment>
}

export { AnimatedNumber, AnimatedScore }
