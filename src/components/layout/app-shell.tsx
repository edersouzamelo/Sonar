"use client"

import { useUser } from "@/contexts/user-context"
import { usePathname } from "next/navigation"
import LoginPage from "@/app/login/page"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function AppShell({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useUser()
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Garantir montagem
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Carregar preferência da sidebar
    useEffect(() => {
        const saved = localStorage.getItem('radar_sidebar_collapsed')
        if (saved !== null) setIsSidebarCollapsed(saved === 'true')
    }, [])

    // Salvar preferência
    useEffect(() => {
        localStorage.setItem('radar_sidebar_collapsed', String(isSidebarCollapsed))
    }, [isSidebarCollapsed])

    // Fechar menu mobile ao mudar de página
    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [pathname])

    if (!isMounted) {
        return null; // Evita qualquer discrepância no primeiro render
    }

    if (pathname === '/login') {
        return <LoginPage />
    }

    if (!isAuthenticated) {
        return <LoginPage />
    }

    return (
        <div className="flex min-h-screen bg-radar-cream">
            {/* Mobile Drawer */}
            <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <DialogContent className="p-0 border-none bg-transparent shadow-none w-fit h-fit left-0 translate-x-0 !top-0 !translate-y-0 sm:max-w-none">
                    <VisuallyHidden>
                        <DialogTitle>Menu de Navegação</DialogTitle>
                    </VisuallyHidden>
                    <div className="h-screen w-[15rem]">
                        <Sidebar />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sidebar Desktop */}
            <div className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 z-[100] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarCollapsed ? 'md:w-20' : 'md:w-60'}`}>
                <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
            </div>

            {/* Área principal */}
            <div className={`flex flex-col flex-1 min-h-screen transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-60'} bg-radar-cream`}>
                <Header onMenuOpen={() => setIsMobileMenuOpen(true)} />
                <main className="flex-1 px-4 md:px-8 pb-4">
                    {children}
                </main>
            </div>
        </div>
    )
}
