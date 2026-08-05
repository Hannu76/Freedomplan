"use client"

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

function AnimatedNumber({ value, className }) {
    const stringValue = value !== undefined && value !== null ? value.toString() : ""
    return (
        <div className={cn("inline-flex items-center leading-none select-none", className)}>
            <div className="inline-flex relative items-center leading-none">
                {stringValue.split("").map((digit, index) => (
                    <SingleNumberHolder key={index} value={digit} index={index} />
                ))}
            </div>
        </div>
    )
}

function SingleNumberHolder({ value }) {
    const notANumber = isNaN(Number.parseInt(value))

    const vars = {
        init: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    }

    return (
        <div
            className="inline-block relative h-[1em] overflow-hidden align-baseline leading-none"
        >
            {notANumber && (
                <motion.span
                    initial="init"
                    animate="animate"
                    exit="exit"
                    variants={vars}
                    key={value}
                    className="h-[1em] inline-flex items-center justify-center leading-none"
                >
                    {value}
                </motion.span>
            )}
            {!notANumber && <RenderStrip value={value} />}
        </div>
    )
}

const zeroToNine = Array.from({ length: 10 }, (_, k) => k)

function RenderStrip({ value }) {
    const prev = useRef(value)
    const currentVal = parseInt(value)
    const prevVal = parseInt(prev.current)

    const diff = currentVal - prevVal
    const initialY = !isNaN(diff) && diff !== 0 ? `${diff * 100}%` : "0%"

    useEffect(() => {
        prev.current = value
    }, [value])

    return (
        <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
                key={value}
                initial={{ y: initialY }}
                animate={{ y: "0%" }}
                exit={{ y: "0%", opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex relative flex-col items-center leading-none h-[1em]"
            >
                {/* Numbers smaller than current */}
                <span className="flex flex-col items-center absolute bottom-full left-0 right-0 leading-none">
                    {zeroToNine.filter(val => val < currentVal).map((val, idx) => (
                        <span key={`${val}_${idx}`} className="h-[1em] flex items-center justify-center leading-none">{val}</span>
                    ))}
                </span>

                {/* Current Number */}
                <span key={`current-${value}`} className="h-[1em] flex items-center justify-center leading-none">{value}</span>

                {/* Numbers larger than current */}
                <span className="flex flex-col items-center absolute top-full left-0 right-0 leading-none">
                    {zeroToNine.filter(val => val > currentVal).map((val, idx) => (
                        <span key={`${val}_${idx}`} className="h-[1em] flex items-center justify-center leading-none">{val}</span>
                    ))}
                </span>
            </motion.div>
        </AnimatePresence>
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
        <div className={cn("relative flex justify-center items-center py-1 px-2 w-full rounded-md", className)}>
            <motion.div layout="size" className='w-fit flex justify-center items-center'>
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
        <div className='relative'>
            <AnimatePresence mode='popLayout'>
                <motion.div
                    animate="animate"
                    className='flex justify-center items-center'
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
