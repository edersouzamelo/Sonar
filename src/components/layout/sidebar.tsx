import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
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
    Banknote,
    Bot,
    ChevronLeft,
    ChevronRight,
    PackageOpen,
    Users2,
    type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/user-context";
import { supplyClasses } from "@/lib/supply-classes";

interface SidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

type NavItem = {
    name: string;
    href: string;
    icon: LucideIcon;
    development?: boolean;
    children?: Array<{
        name: string;
        href: string;
    }>;
};

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
    const { role, logout } = useUser();
    const [flyoutTop, setFlyoutTop] = useState(0);
    const [openFlyout, setOpenFlyout] = useState<string | null>(null);
    const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const keepFlyoutOpen = (itemName: string) => {
        if (flyoutCloseTimer.current) {
            clearTimeout(flyoutCloseTimer.current);
        }
        setOpenFlyout(itemName);
    };

    const closeFlyoutSoon = () => {
        if (flyoutCloseTimer.current) {
            clearTimeout(flyoutCloseTimer.current);
        }
        flyoutCloseTimer.current = setTimeout(() => setOpenFlyout(null), 250);
    };

    const classModules = supplyClasses.map(supplyClass => ({
        name: supplyClass.label,
        href: `/classes?classe=${supplyClass.key}`,
    }));

    const navigation: NavItem[] = [
        { name: "Agente Colosso", href: "/colosso", icon: Bot },
        { name: "Agenda", href: "/agenda", icon: CalendarIcon },
        { name: "Ordens de Servico", href: "/issues", icon: AlertCircle },
        { name: "Classes", href: "/classes", icon: PackageOpen, children: classModules },
        { name: "Organizacoes Militares", href: "/organizacoes-militares", icon: LayoutDashboard, development: true },
        { name: "Execucao Orcamentaria", href: "/execucao-orcamentaria", icon: Banknote, development: true },
        { name: "Pregoes", href: "/tenders", icon: Gavel, development: true },
        { name: "Vinculos", href: "/links", icon: Users2, development: true },
        { name: "Relatorios", href: "/reports", icon: FileText, development: true },
        { name: "Contato", href: "/contact", icon: MessageSquare },
    ];

    if ((role as string) === "Chefe da Secao de Licitacoes" || role === "Administrador") {
        navigation.push({ name: "Gerenciamento de Perfis", href: "/admin", icon: Shield, development: true });
        navigation.push({ name: "Central de Alertas", href: "/admin/notifications", icon: Bell, development: true });
    }

    return (
        <div className={cn(
            "flex h-full flex-col bg-[#1A1A1A] text-[#FDFBF7] shadow-2xl transition-all duration-300 border-r border-white/10",
            isCollapsed ? "w-20 rounded-r-3xl m-0 h-screen" : "w-60 rounded-r-[3rem] m-4 ml-4 h-[calc(100vh-2rem)]"
        )}>
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

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-visible px-3 py-4">
                <nav className="space-y-2">
                    {navigation.map((item) => {
                        const hasChildren = Boolean(item.children?.length);

                        return (
                            <div
                                key={item.name}
                                className="group/nav relative"
                                onMouseEnter={(event) => {
                                    if (hasChildren) {
                                        setFlyoutTop(event.currentTarget.getBoundingClientRect().top);
                                        keepFlyoutOpen(item.name);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (hasChildren) {
                                        closeFlyoutSoon();
                                    }
                                }}
                            >
                                <Link
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
                                    {!isCollapsed && (
                                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                            <span className="truncate">{item.name}</span>
                                            {hasChildren && <ChevronRight className="h-4 w-4 shrink-0 opacity-60 transition-transform group-hover/nav:translate-x-0.5" />}
                                            {item.development && (
                                                <span className="shrink-0 rounded bg-yellow-300 px-1.5 py-0.5 text-[9px] font-black leading-none text-black">
                                                    EM DEV
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </Link>

                                {hasChildren && (
                                    <div
                                        onMouseEnter={() => keepFlyoutOpen(item.name)}
                                        onMouseLeave={closeFlyoutSoon}
                                        className={cn(
                                            "pointer-events-none fixed z-[140] w-72 translate-x-[-8px] opacity-0 transition-all duration-200 ease-out",
                                            openFlyout === item.name && "pointer-events-auto translate-x-0 opacity-100",
                                            "group-hover/nav:pointer-events-auto group-hover/nav:translate-x-0 group-hover/nav:opacity-100",
                                            "group-focus-within/nav:pointer-events-auto group-focus-within/nav:translate-x-0 group-focus-within/nav:opacity-100",
                                            isCollapsed ? "left-[5.5rem]" : "left-[16.5rem]"
                                        )}
                                        style={{ top: `${flyoutTop}px` }}
                                    >
                                        <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-2 text-[#FDFBF7] shadow-2xl shadow-black/30">
                                            <div className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-[#FFB000]">
                                                Classes de suprimento
                                            </div>
                                            <div className="space-y-1">
                                                {item.children?.map((child) => (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        className="block rounded-xl px-3 py-2.5 text-xs font-semibold leading-tight text-gray-300 transition-colors hover:bg-[#FFB000] hover:text-[#1A1A1A]"
                                                    >
                                                        {child.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
                        {!isCollapsed && "Configuracoes"}
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
