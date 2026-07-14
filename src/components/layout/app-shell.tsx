"use client"

import { useUser } from "@/contexts/user-context"
import { usePathname } from "next/navigation"
import LoginPage from "@/app/login/page"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { isDevOnlyPath } from "@/lib/dev-access"
import { SonarGuide } from "@/components/onboarding/sonar-guide"
import { HelpCircle } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isDeveloper, user } = useUser()
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [guideOpenRequest, setGuideOpenRequest] = useState(0)
    const isCurrentPathDevOnly = isDevOnlyPath(pathname)
    const showDevelopmentBanner = isCurrentPathDevOnly && isDeveloper
    const isPresentationSurface = pathname.startsWith("/monitor") || /^\/apresentacoes\/[^/]+\/apresentar$/.test(pathname)

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

    if (isPresentationSurface) {
        return <>{children}</>
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
                    {showDevelopmentBanner && (
                        <div className="mb-4 rounded-lg border-2 border-fuchsia-300 bg-fuchsia-500 px-4 py-3 text-center text-sm font-black uppercase tracking-wide text-white shadow-[0_0_24px_rgba(217,70,239,0.65)]">
                            EM DESENVOLVIMENTO
                        </div>
                    )}
                    {isCurrentPathDevOnly && !isDeveloper ? (
                        <div className="flex min-h-[60vh] items-center justify-center">
                            <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Acesso restrito</p>
                                <h1 className="mt-3 text-2xl font-black text-radar-dark">Modulo em desenvolvimento</h1>
                                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                                    Esta area esta visivel apenas para o perfil administrador/dev enquanto estiver em desenvolvimento.
                                </p>
                            </div>
                        </div>
                    ) : children}
                </main>
                <footer className="px-4 pb-5 md:px-8">
                    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur sm:flex-row">
                        <span>SONAR - apoio digital ao controle operacional</span>
                        <button
                            type="button"
                            data-tour="guide-replay"
                            onClick={() => setGuideOpenRequest(value => value + 1)}
                            className="inline-flex items-center gap-2 rounded-full border border-radar-gold/40 bg-radar-gold/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-radar-dark transition-all hover:bg-radar-gold hover:shadow-md"
                        >
                            <HelpCircle className="h-4 w-4" />
                            Reassistir guia
                        </button>
                    </div>
                </footer>
            </div>
            <SonarGuide
                user={user}
                isAuthenticated={isAuthenticated}
                forceOpenRequest={guideOpenRequest}
            />
        </div>
    )
}
