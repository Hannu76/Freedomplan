import React, { useState } from "react";
import { cn } from "../../lib/utils";

export function ElasticStack({
    items,
    itemSize = 40,
    overlap = 10,
    pushForce = 8,
    className,
    ...props
}) {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const total = items.length;
    // Custom spring-like easing from the original CSS
    const springEasing = "linear(0, 0.79 14.4%, 1.026 22.4%, 1.164 31.2%, 1.207 38.2%, 1.208 46.2%, 1.033 80%, 1)";

    return (
        <div
            className={cn("flex items-center justify-center cursor-pointer py-1", className)}
            onMouseLeave={() => setHoveredIndex(null)}
            {...props}
        >
            {items.map((item, i) => {
                let translateX = 0;
                let scale = 1;
                let zIndex = i; // Base stacking order
                let isHovered = hoveredIndex === i;

                if (hoveredIndex !== null) {
                    if (i > hoveredIndex) {
                        translateX = Math.min(pushForce * (total - i - 1), overlap);
                    } else if (i < hoveredIndex) {
                        translateX = -Math.min(pushForce * i, overlap);
                    } else {
                        scale = 1.2;
                        zIndex = 100;
                    }
                }

                return (
                    <div
                        key={item.id}
                        onMouseEnter={() => setHoveredIndex(i)}
                        className={cn(
                            "relative items-center justify-center rounded-full isolate transition-all duration-500 bg-neutral-100 dark:bg-neutral-800",
                            "border-[2px] border-white shadow-md dark:border-neutral-900",
                            i >= 4 ? "hidden sm:flex" : "flex",
                            isHovered ? "shadow-lg ring-2 ring-emerald-400/60" : "shadow-sm"
                        )}
                        style={{
                            width: itemSize,
                            height: itemSize,
                            marginLeft: i === 0 ? 0 : -overlap,
                            transform: `translateX(${translateX}px) scale(${scale})`,
                            transitionTimingFunction: springEasing,
                            zIndex,
                        }}
                    >
                        {item.image ? (
                            <img
                                src={item.image}
                                alt={item.name || `Avatar ${i}`}
                                className="w-full h-full object-cover rounded-full pointer-events-none"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full flex items-center justify-center font-semibold text-[10px] text-neutral-500 dark:text-neutral-400">
                                {item.name ? item.name.charAt(0) : i + 1}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default ElasticStack;
