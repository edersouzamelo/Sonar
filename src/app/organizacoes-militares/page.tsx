"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CmoOrganizationGroup, cmoOrganizationGroups } from "@/lib/cmo-organizations";
import { cn } from "@/lib/utils";

const mapBounds = {
    west: -64.2,
    east: -49.6,
    south: -24.8,
    north: -6.8,
};

const mapPins = [
    { city: "Cuiabá", state: "MT", lat: -15.601, lon: -56.097, label: "13ª Bda / OM MT" },
    { city: "Cáceres", state: "MT", lat: -16.071, lon: -57.679, label: "Fronteira Jauru" },
    { city: "Rondonópolis", state: "MT", lat: -16.467, lon: -54.638, label: "18º GAC" },
    { city: "Aragarças", state: "GO", lat: -15.897, lon: -52.250, label: "58º BI Mtz" },
    { city: "Campo Grande", state: "MS", lat: -20.469, lon: -54.620, label: "CMO / 9º Gpt Log" },
    { city: "Dourados", state: "MS", lat: -22.223, lon: -54.812, label: "4ª Bda C Mec" },
    { city: "Corumbá", state: "MS", lat: -19.008, lon: -57.651, label: "18ª Bda / Pantanal" },
    { city: "Aquidauana", state: "MS", lat: -20.471, lon: -55.787, label: "9º BE Cmb" },
    { city: "Jardim", state: "MS", lat: -21.480, lon: -56.150, label: "4ª Cia E Cmb Mec" },
    { city: "Ponta Porã", state: "MS", lat: -22.529, lon: -55.720, label: "11º RC Mec" },
    { city: "Amambai", state: "MS", lat: -23.105, lon: -55.225, label: "17º RC Mec" },
    { city: "Coxim", state: "MS", lat: -18.506, lon: -54.760, label: "47º BI" },
    { city: "Porto Murtinho", state: "MS", lat: -21.698, lon: -57.883, label: "2ª Cia Fron" },
    { city: "Bela Vista", state: "MS", lat: -22.107, lon: -56.526, label: "10º RC Mec" },
];

function pinPosition(lat: number, lon: number) {
    const left = ((lon - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 100;
    const top = ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * 100;
    return { left: `${left}%`, top: `${top}%` };
}

const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
};

function AnimatedCollapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
    const innerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(open ? "auto" : "0px");

    useEffect(() => {
        const inner = innerRef.current;
        if (!inner) return;

        if (open) {
            setHeight(`${inner.scrollHeight}px`);
            const timeoutId = window.setTimeout(() => setHeight("auto"), 360);
            return () => window.clearTimeout(timeoutId);
        }

        setHeight(`${inner.scrollHeight}px`);
        const frameId = window.requestAnimationFrame(() => setHeight("0px"));
        return () => window.cancelAnimationFrame(frameId);
    }, [open]);

    return (
        <div
            className={cn(
                "overflow-hidden transition-[height,opacity,transform] duration-300 ease-out will-change-[height,opacity,transform]",
                open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
                className
            )}
            style={{ height }}
        >
            <div ref={innerRef}>{children}</div>
        </div>
    );
}

export default function OrganizacoesMilitaresPage() {
    const [groups, setGroups] = useState<CmoOrganizationGroup[]>(cmoOrganizationGroups);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(cmoOrganizationGroups.map(group => [group.id, false]))
    );
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState("");
    const [error, setError] = useState("");

    const totalUnits = useMemo(() => groups.reduce((sum, command) => sum + command.units.length, 0), [groups]);

    const loadGroups = async () => {
        setLoading(true);
        setError("");
        try {
            const token = await getToken();
            const response = await fetch("/api/official-organizations", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha ao carregar relacao oficial de OM.");
            setGroups(result.groups || cmoOrganizationGroups);
            setOpenGroups(current =>
                Object.fromEntries((result.groups || []).map((group: CmoOrganizationGroup) => [group.id, current[group.id] ?? false]))
            );
        } catch (err: any) {
            setError(err.message || "Falha ao carregar relacao oficial de OM.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGroups();
    }, []);

    const saveAction = async (payload: Record<string, any>, key: string) => {
        setSavingKey(key);
        setError("");
        try {
            const token = await getToken();
            const response = await fetch("/api/official-organizations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Falha ao salvar relacao oficial de OM.");
            setGroups(result.groups || []);
            setOpenGroups(current => ({
                ...current,
                ...Object.fromEntries((result.groups || []).map((group: CmoOrganizationGroup) => [group.id, current[group.id] ?? true])),
            }));
        } catch (err: any) {
            setError(err.message || "Falha ao salvar relacao oficial de OM.");
        } finally {
            setSavingKey("");
        }
    };

    const updateGroup = (group: CmoOrganizationGroup, patch: Partial<CmoOrganizationGroup>) => {
        saveAction({
            action: "updateGroup",
            groupId: group.id,
            name: patch.name ?? group.name,
            location: patch.location ?? group.location,
        }, `group-${group.id}`);
    };

    const updateOrganization = (groupId: string, organizationId: string, name: string) => {
        saveAction({
            action: "updateOrganization",
            groupId,
            organizationId,
            name,
        }, `om-${organizationId}`);
    };

    return (
        <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6 pb-8">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-radar-dark">Organizações Militares apoiadas</h1>
                    <p className="mt-1 max-w-4xl text-sm text-slate-500">
                        Relação oficial de grandes comandos e OM do CMO. Alterações feitas aqui são espelhadas nas Consolidações e no Colosso.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => saveAction({ action: "addGroup", name: "Novo grande comando", location: "" }, "add-group")}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-radar-dark px-4 text-sm font-black text-radar-gold shadow-sm transition-colors hover:bg-black"
                >
                    {savingKey === "add-group" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Grande comando
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <section className="grid flex-1 gap-5 xl:grid-cols-2">
                <div className="min-h-[640px] rounded-lg border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-radar-dark p-2 text-radar-gold">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-radar-dark">Relação oficial</h2>
                                <p className="text-xs text-slate-500">{groups.length} grandes comandos · {totalUnits} OM listadas</p>
                            </div>
                        </div>
                        {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
                    </div>

                    <div className="max-h-[calc(100vh-15rem)] space-y-3 overflow-y-auto p-5">
                        {groups.map(group => {
                            const isOpen = openGroups[group.id] ?? false;
                            return (
                                <section key={group.id} className="rounded-lg border border-slate-100 bg-white shadow-sm">
                                    <div className="flex items-start gap-3 p-4">
                                        <button
                                            type="button"
                                            onClick={() => setOpenGroups(current => ({ ...current, [group.id]: !isOpen }))}
                                            className="mt-1 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-radar-dark"
                                            title={isOpen ? "Recolher" : "Expandir"}
                                        >
                                            <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", !isOpen && "-rotate-90")} />
                                        </button>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <input
                                                defaultValue={group.name}
                                                onBlur={event => updateGroup(group, { name: event.target.value })}
                                                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-base font-black text-radar-dark outline-none focus:border-radar-gold focus:ring-2 focus:ring-radar-gold/20"
                                            />
                                            <input
                                                defaultValue={group.location}
                                                onBlur={event => updateGroup(group, { location: event.target.value })}
                                                className="h-8 w-full rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-500 outline-none focus:border-radar-gold focus:ring-2 focus:ring-radar-gold/20"
                                                placeholder="Localidade"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {savingKey === `group-${group.id}` && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{group.units.length} OM</span>
                                            <button
                                                type="button"
                                                onClick={() => saveAction({ action: "deleteGroup", groupId: group.id }, `delete-group-${group.id}`)}
                                                className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                title="Excluir grande comando"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatedCollapse open={isOpen} className="border-t border-amber-100 bg-white/80">
                                        <div className="space-y-2 px-4 pb-4 pt-3">
                                            {group.units.map((unit, index) => (
                                                <div key={unit.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 text-xs text-slate-600 transition-colors">
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-radar-gold text-[10px] font-black text-radar-dark">
                                                        {index + 1}
                                                    </span>
                                                    <input
                                                        defaultValue={unit.name}
                                                        onBlur={event => updateOrganization(group.id, unit.id, event.target.value)}
                                                        className="min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-radar-gold focus:bg-amber-50"
                                                    />
                                                    {savingKey === `om-${unit.id}` && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                                                    <button
                                                        type="button"
                                                        onClick={() => saveAction({ action: "deleteOrganization", organizationId: unit.id }, `delete-om-${unit.id}`)}
                                                        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                        title="Excluir OM"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => saveAction({ action: "addOrganization", groupId: group.id, name: "Nova OM" }, `add-om-${group.id}`)}
                                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-xs font-black text-slate-600 transition-colors hover:border-radar-gold hover:bg-amber-50 hover:text-radar-dark"
                                            >
                                                {savingKey === `add-om-${group.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                Adicionar OM
                                            </button>
                                        </div>
                                    </AnimatedCollapse>
                                </section>
                            );
                        })}
                    </div>
                </div>

                <div className="min-h-[640px] rounded-lg border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-radar-dark">Mapa operacional MT/MS</h2>
                                <p className="text-xs text-slate-500">Base OpenStreetMap com camada de pins por localidade</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="relative h-[calc(100vh-15rem)] min-h-[580px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            <iframe
                                title="Mapa MT e MS"
                                className="absolute inset-0 h-full w-full"
                                src="https://www.openstreetmap.org/export/embed.html?bbox=-64.2%2C-24.8%2C-49.6%2C-6.8&layer=mapnik"
                                loading="lazy"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-white/5" />

                            <div className="absolute inset-0">
                                {mapPins.map(pin => (
                                    <div
                                        key={`${pin.city}-${pin.label}`}
                                        className="group/pin absolute -translate-x-1/2 -translate-y-full"
                                        style={pinPosition(pin.lat, pin.lon)}
                                    >
                                        <div className="relative flex flex-col items-center">
                                            <div className="flex h-7 w-7 items-center justify-center rounded-full border-4 border-radar-gold bg-radar-dark shadow-lg">
                                                <div className="h-2.5 w-2.5 rounded-full bg-radar-gold" />
                                            </div>
                                            <div className="h-3 w-1 rounded-b-full bg-radar-dark" />
                                            <div className="pointer-events-none absolute left-8 top-0 hidden min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl group-hover/pin:block">
                                                <p className="font-black text-radar-dark">{pin.city}/{pin.state}</p>
                                                <p className="mt-0.5 text-slate-500">{pin.label}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
