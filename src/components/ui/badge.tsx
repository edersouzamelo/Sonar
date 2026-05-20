import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-radar-dark text-radar-cream hover:bg-radar-dark/80",
                secondary:
                    "border-transparent bg-radar-beige text-radar-dark hover:bg-radar-beige/80",
                destructive:
                    "border-transparent bg-red-100 text-red-600 hover:bg-red-200",
                outline: "text-radar-dark border-radar-dark",
                success: "border-transparent bg-green-100 text-green-700 hover:bg-green-200",
                warning: "border-transparent bg-radar-gold text-radar-dark hover:bg-radar-gold/80",
                info: "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200",
                alert: "border-transparent bg-red-600 text-white hover:bg-red-700",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
