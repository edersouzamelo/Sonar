"use client"
import { useState, useEffect } from 'react';
import { useUser, UserRole } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogIn, GraduationCap, Gavel, ShieldCheck, Mail } from 'lucide-react';

export default function LoginPage() {
    const { loginWithGoogle, isAuthenticated, user, logout } = useUser();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-radar-dark p-4">
                <Card className="w-full max-w-md border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden rounded-[2rem]">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-20 h-20 rounded-full border-4 border-radar-gold overflow-hidden mb-4 shadow-lg">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-radar-dark flex items-center justify-center text-radar-gold text-2xl font-bold">
                                    {user?.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl font-black text-radar-dark dark:text-white">Bem-vindo, {user?.name}</CardTitle>
                        <CardDescription>{user?.email}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <Button
                            className="w-full h-12 bg-radar-gold hover:bg-radar-gold/90 text-radar-dark font-bold rounded-xl"
                            onClick={() => window.location.href = '/'}
                        >
                            Acessar Dashboard
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full h-12 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 rounded-xl"
                            onClick={logout}
                        >
                            Sair da Conta
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-radar-dark relative overflow-hidden">
            {/* Elementos Decorativos de Fundo */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-radar-gold/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <Card className="w-full max-w-[400px] border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] bg-white dark:bg-slate-900 overflow-hidden rounded-[2.5rem] relative z-10 mx-4">
                <div className="h-2 bg-gradient-to-r from-radar-gold to-radar-dark" />

                <CardHeader className="text-center pt-10 pb-6">
                    <div className="mx-auto mb-6 flex items-center justify-center">
                        <img
                            src="/sonar-logo-transparent.png"
                            alt="SONAR"
                            className="w-64 h-64 object-contain drop-shadow-2xl"
                        />
                    </div>
                    <CardTitle className="text-3xl font-black text-radar-dark dark:text-white tracking-tight">SONAR</CardTitle>
                    <CardDescription className="text-slate-500 font-medium px-8">
                        Sistema SONAR (v3.1.0)
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-10 pb-12 space-y-6">
                    <div className="space-y-4">
                        <Button
                            className="w-full h-14 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-100 shadow-sm rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="font-bold">Acessar com Google</span>
                        </Button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 font-bold tracking-widest">Segurança OM</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed italic">
                                Acesso restrito a militares e servidores autorizados.<br />
                                Seus dados de navegação são auditados.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-white/20 text-[10px] font-bold tracking-widest uppercase">
                    Quartel-General do Exército • SONAR System
                </p>
            </div>
        </div>
    );
}
