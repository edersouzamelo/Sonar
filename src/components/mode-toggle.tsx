"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <Button
            variant="ghost"
            size="icon"
            className="text-radar-dark hover:bg-radar-beige/50"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? 'Mudar para claro' : 'Mudar para escuro'}
        >
            <Sun className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
