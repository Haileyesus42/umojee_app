"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "../../lib/utils";

const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
        checkpoints: number[];
    }
>(({ className, value, checkpoints, ...props }, ref) => {
    return (
        <ProgressPrimitive.Root
            ref={ref}
            className={cn(
                "relative h-1 w-full overflow-hidden rounded-full bg-primary/20",
                className
            )}
            {...props}
        >
            <ProgressPrimitive.Indicator
                className="h-full w-full flex-1 bg-primary transition-all"
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
            {/* Render checkpoint markers */}
            {checkpoints?.map((checkpoint, index) => (
                <div
                    key={index}
                    className="absolute top-0 h-full w-1 bg-[#00adef]"
                    style={{ left: `${checkpoint}%` }} // Adjust width and color as needed
                />
            ))}
        </ProgressPrimitive.Root>
    );
});
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
