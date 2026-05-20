"use client"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, UserRole } from "@/contexts/user-context"
import { User, Shield, Briefcase, FileText, Gavel, Users, LogOut } from "lucide-react"

export function UserNav() {
    const { role, setRole, user, logout } = useUser()

    const roles: { label: UserRole, icon: any }[] = [
        { label: 'Ordenador de Despesas', icon: Shield },
        { label: 'Agente Diretor', icon: Briefcase },
        { label: 'Chefe da Seção de Licitações', icon: FileText },
        { label: 'Pregoeiro', icon: Gavel },
        { label: 'Auxiliar', icon: Users },
        { label: 'Setor Requisitante', icon: User },
    ]

    const getInitials = (name: string) => {
        if (!name) return "US";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-radar-gold shadow-sm transition-transform hover:scale-105">
                        <AvatarImage src={user?.avatar || ""} alt={user?.name || "Usuário"} />
                        <AvatarFallback className="bg-radar-dark text-radar-gold font-bold">
                            {getInitials(user?.name || role)}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl shadow-xl border-slate-100 dark:border-slate-800" align="end" forceMount>
                <DropdownMenuLabel className="font-normal px-4 py-3">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-bold text-radar-dark dark:text-white leading-none">
                            {user?.name || "Usuário Radar"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                            {user?.email || role}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 tracking-widest px-4">Função Atual</DropdownMenuLabel>
                    <DropdownMenuItem className="px-4 py-2 focus:bg-transparent cursor-default">
                        <Shield className="mr-2 h-4 w-4 text-radar-gold" />
                        <span className="font-bold">{role}</span>
                        <span className="ml-auto text-radar-gold font-black">✓</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => logout()}
                    className="px-4 py-3 text-red-500 font-bold focus:bg-red-50 dark:focus:bg-red-900/10 cursor-pointer"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair do Sistema</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
