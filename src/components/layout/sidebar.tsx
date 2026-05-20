import Link from "next/link";
import Image from "next/image";
import {
    LayoutDashboard,
    Gavel,
    AlertCircle,
    FileText,
    Settings,
    LogOut,
    Calendar as CalendarIcon,
    Shield,
    MessageSquare,
    Bell,
    ChevronLeft,
    ChevronRight,
    Users2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/user-context";

interface SidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const { role, logout } = useUser();

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Agenda', href: '/agenda', icon: CalendarIcon },
        { name: 'Pregões', href: '/tenders', icon: Gavel },
        { name: 'Vínculos', href: '/links', icon: Users2 },
        { name: 'Intercorrências', href: '/issues', icon: AlertCircle },
        { name: 'Relatórios', href: '/reports', icon: FileText },
        { name: 'Contato', href: '/contact', icon: MessageSquare },
    ];

    if (role === 'Chefe da Seção de Licitações' || role === 'Administrador') {
        navigation.push({ name: 'Gerenciamento de Perfis', href: '/admin', icon: Shield });
        navigation.push({ name: 'Central de Alertas', href: '/admin/notifications', icon: Bell });
    }

    return (
        <div className={cn(
            "flex h-full flex-col bg-[#1A1A1A] text-[#FDFBF7] shadow-2xl transition-all duration-300 border-r border-white/10",
            isCollapsed ? "w-20 rounded-r-3xl m-0 h-screen" : "w-60 rounded-r-[3rem] m-4 ml-4 h-[calc(100vh-2rem)]"
        )}>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className={cn(
                    "absolute -right-3 top-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#1A1A1A] text-[#FFB000] shadow-md transition-transform hover:scale-110 z-[60]",
                    isCollapsed && "rotate-180"
                )}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            <div className={cn(
                "flex items-center justify-center py-4 shrink-0 transition-all duration-300",
                isCollapsed ? "h-20" : "h-44"
            )}>
                <Link href="/" className="flex flex-col items-center gap-4 transition-transform hover:scale-105">
                    <div className={cn(
                        "relative drop-shadow-2xl transition-all duration-300",
                        isCollapsed ? "h-12 w-12" : "h-32 w-32"
                    )}>
                        <Image
                            src="/sonar-logo-transparent.png"
                            alt="SONAR Logo"
                            fill
                            className="object-contain"
                            priority
                            unoptimized
                        />
                    </div>
                </Link>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto px-3 py-4">
                <nav className="space-y-2">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            title={isCollapsed ? item.name : ""}
                            className={cn(
                                "group flex items-center rounded-2xl p-3 text-sm font-medium transition-all duration-200",
                                "text-gray-400 hover:bg-[#FFB000] hover:text-[#1A1A1A] hover:shadow-lg hover:shadow-[#FFB000]/20",
                                isCollapsed ? "justify-center" : "px-4"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "transition-colors group-hover:text-radar-dark h-5 w-5",
                                    !isCollapsed && "mr-3"
                                )}
                                aria-hidden="true"
                            />
                            {!isCollapsed && <span>{item.name}</span>}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className={cn("shrink-0 transition-all duration-300", isCollapsed ? "p-2" : "p-6")}>
                <div className={cn(
                    "rounded-2xl bg-white/5 backdrop-blur-sm transition-all duration-300",
                    isCollapsed ? "p-1" : "p-4"
                )}>
                    <button className={cn(
                        "group flex w-full items-center rounded-xl p-2 text-sm font-medium text-gray-400 hover:text-white transition-colors",
                        isCollapsed ? "justify-center" : ""
                    )}>
                        <Settings className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                        {!isCollapsed && "Configurações"}
                    </button>
                    <button
                        onClick={logout}
                        className={cn(
                            "mt-2 group flex w-full items-center rounded-xl p-2 text-sm font-medium text-gray-400 hover:text-red-400 transition-colors",
                            isCollapsed ? "justify-center" : ""
                        )}
                    >
                        <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                        {!isCollapsed && "Sair"}
                    </button>
                </div>
            </div>
        </div>
    );
}
