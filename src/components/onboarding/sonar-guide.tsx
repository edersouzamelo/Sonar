"use client"

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type GuideStep = {
    target: string;
    title: string;
    body: string;
};

type Rect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

const guideSteps: GuideStep[] = [
    {
        target: "[data-tour='sidebar']",
        title: "Menu principal",
        body: "Aqui ficam os módulos do SONAR. Os itens disponíveis para o seu perfil aparecem automaticamente; módulos em desenvolvimento ficam ocultos para usuários comuns.",
    },
    {
        target: "[data-tour='nav-colosso']",
        title: "Agente Colosso",
        body: "Use o Colosso para consultar informações do sistema, inclusive prazos, documentos e consolidações que já estejam registrados no banco e no RAG.",
    },
    {
        target: "[data-tour='nav-agenda']",
        title: "Agenda",
        body: "Acompanhe prazos operacionais. Demandas das consolidações com data de prazo também aparecem aqui.",
    },
    {
        target: "[data-tour='nav-classes']",
        title: "Classes de suprimento",
        body: "Acesse as áreas de trabalho das Classes I a X. Dentro de cada classe, o módulo Consolidações organiza demandas por OM e por grande comando.",
    },
    {
        target: "[data-tour='nav-organizacoes']",
        title: "Organizações Militares",
        body: "Esta é a relação oficial de OM apoiadas. Alterações feitas aqui espelham nos módulos que dependem dessa lista.",
    },
    {
        target: "[data-tour='header-search']",
        title: "Busca rápida",
        body: "Use a busca para localizar processos e informações com mais agilidade quando estiver nos módulos de acompanhamento.",
    },
    {
        target: "[data-tour='header-status']",
        title: "Status do banco",
        body: "Este indicador mostra se o SONAR está conectado ao banco e se os dados foram sincronizados.",
    },
    {
        target: "[data-tour='header-notifications']",
        title: "Notificações",
        body: "Alertas de prazos e avisos importantes aparecem aqui, com leitura rápida pelo menu suspenso.",
    },
    {
        target: "[data-tour='header-user']",
        title: "Perfil",
        body: "No perfil você confirma sua conta, acessa opções pessoais e pode sair do sistema com segurança.",
    },
    {
        target: "[data-tour='guide-replay']",
        title: "Reassistir quando precisar",
        body: "Depois do primeiro acesso, o guia não abre sozinho de novo. Este botão no rodapé permite assistir novamente a qualquer momento.",
    },
];

const localStorageKey = (userId?: string, email?: string) =>
    `sonar:onboarding-guide-completed:${userId || email || "anonymous"}`;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function SonarGuide({
    user,
    isAuthenticated,
    forceOpenRequest,
}: {
    user: { id: string; name: string; email: string; avatar?: string } | null;
    isAuthenticated: boolean;
    forceOpenRequest: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<Rect | null>(null);
    const [hasCheckedFirstAccess, setHasCheckedFirstAccess] = useState(false);

    const availableSteps = useMemo(() => {
        if (typeof document === "undefined") return guideSteps;
        return guideSteps.filter(step => document.querySelector(step.target));
    }, [isOpen, stepIndex]);

    const currentStep = availableSteps[stepIndex] || availableSteps[0];
    const isLastStep = stepIndex >= availableSteps.length - 1;

    useEffect(() => {
        if (!isAuthenticated || !user || hasCheckedFirstAccess) return;

        const key = localStorageKey(user.id, user.email);
        const localCompleted = window.localStorage.getItem(key) === "true";

        if (localCompleted) {
            setHasCheckedFirstAccess(true);
            return;
        }

        let cancelled = false;

        const checkProfileGuideStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("sonar_guide_completed_at")
                    .eq("id", user.id)
                    .maybeSingle();

                if (cancelled) return;

                const completedAt = (data as { sonar_guide_completed_at?: string | null } | null)?.sonar_guide_completed_at;
                if (!error && completedAt) {
                    window.localStorage.setItem(key, "true");
                    setHasCheckedFirstAccess(true);
                    return;
                }
            } catch {
                // Fallback local: se o campo ainda nao existir no Supabase, o guia continua funcional por conta/dispositivo.
            }

            if (!cancelled) {
                setStepIndex(0);
                setIsOpen(true);
                setHasCheckedFirstAccess(true);
            }
        };

        checkProfileGuideStatus();

        return () => {
            cancelled = true;
        };
    }, [hasCheckedFirstAccess, isAuthenticated, user]);

    useEffect(() => {
        if (!forceOpenRequest || !isAuthenticated) return;
        setStepIndex(0);
        setIsOpen(true);
    }, [forceOpenRequest, isAuthenticated]);

    useEffect(() => {
        if (!isOpen || !currentStep) return;

        const updateRect = () => {
            const element = document.querySelector(currentStep.target) as HTMLElement | null;
            if (!element) {
                setTargetRect(null);
                return;
            }

            element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

            window.setTimeout(() => {
                const rect = element.getBoundingClientRect();
                setTargetRect({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                });
            }, 180);
        };

        updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);

        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
        };
    }, [currentStep, isOpen]);

    const markCompleted = async () => {
        if (user) {
            window.localStorage.setItem(localStorageKey(user.id, user.email), "true");
            try {
                await supabase
                    .from("profiles")
                    .update({ sonar_guide_completed_at: new Date().toISOString() })
                    .eq("id", user.id);
            } catch {
                // O fallback local acima ja garante que o guia nao reapareca neste dispositivo.
            }
        }
    };

    const closeGuide = async (completed = true) => {
        if (completed) await markCompleted();
        setIsOpen(false);
    };

    const nextStep = async () => {
        if (isLastStep) {
            await closeGuide(true);
            return;
        }
        setStepIndex(index => Math.min(index + 1, availableSteps.length - 1));
    };

    const previousStep = () => {
        setStepIndex(index => Math.max(index - 1, 0));
    };

    if (!isOpen || !currentStep) return null;

    const padding = 10;
    const highlight = targetRect
        ? {
            top: Math.max(targetRect.top - padding, 8),
            left: Math.max(targetRect.left - padding, 8),
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
        }
        : null;

    const cardWidth = 360;
    const cardLeft = highlight
        ? clamp(
            highlight.left + highlight.width + 18,
            16,
            Math.max(16, window.innerWidth - cardWidth - 16),
        )
        : clamp(window.innerWidth / 2 - cardWidth / 2, 16, window.innerWidth - cardWidth - 16);
    const preferAbove = highlight && highlight.top + highlight.height + 250 > window.innerHeight;
    const cardTop = highlight
        ? clamp(
            preferAbove ? highlight.top - 250 : highlight.top,
            16,
            Math.max(16, window.innerHeight - 260),
        )
        : 120;

    return (
        <div className="fixed inset-0 z-[300]">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />

            {highlight && (
                <div
                    className="absolute rounded-3xl border-2 border-radar-gold bg-white/10 shadow-[0_0_0_9999px_rgba(2,6,23,0.68),0_0_34px_rgba(255,176,0,0.8)] transition-all duration-300"
                    style={highlight}
                />
            )}

            <div
                className="absolute w-[calc(100vw-2rem)] max-w-[360px] rounded-3xl border border-white/20 bg-white p-5 text-radar-dark shadow-2xl transition-all duration-300"
                style={{ left: cardLeft, top: cardTop }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-radar-gold">
                            <HelpCircle className="h-4 w-4" />
                            Guia SONAR
                        </div>
                        <h2 className="mt-2 text-xl font-black tracking-tight">{currentStep.title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => closeGuide(true)}
                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="Fechar guia"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{currentStep.body}</p>

                <div className="mt-5 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-400">
                        {stepIndex + 1} de {availableSteps.length}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={previousStep}
                            disabled={stepIndex === 0}
                            className="rounded-full"
                        >
                            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                            Voltar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={nextStep}
                            className="rounded-full bg-radar-dark text-radar-cream hover:bg-radar-gold hover:text-radar-dark"
                        >
                            {isLastStep ? (
                                <>
                                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                    Concluir
                                </>
                            ) : (
                                <>
                                    Proximo
                                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
