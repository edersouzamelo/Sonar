import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileSearch,
  PackageCheck,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

const summary = [
  {
    label: "Credito descentralizado",
    value: "R$ 18,7 mi",
    detail: "12 OM monitoradas",
    icon: Banknote,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    label: "Empenhado",
    value: "R$ 13,2 mi",
    detail: "70,6% do credito",
    icon: TrendingUp,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    label: "A liquidar",
    value: "R$ 4,1 mi",
    detail: "28 notas de empenho",
    icon: Clock3,
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    label: "Critico +30 dias",
    value: "R$ 1,3 mi",
    detail: "7 empenhos em atencao",
    icon: ShieldAlert,
    tone: "bg-red-50 text-red-700 border-red-100",
  },
];

const executionRows = [
  {
    om: "18 B Trnp",
    uasg: "160136",
    classe: "Classe III",
    credito: "R$ 4,20 mi",
    empenhado: "R$ 3,62 mi",
    liquidado: "R$ 2,81 mi",
    pendente: "R$ 810 mil",
    dias: 34,
    risco: "Alto",
    causa: "Entrega parcial sem aceite formal no processo.",
  },
  {
    om: "9 B Sup",
    uasg: "160141",
    classe: "Classe I",
    credito: "R$ 3,85 mi",
    empenhado: "R$ 2,94 mi",
    liquidado: "R$ 2,63 mi",
    pendente: "R$ 310 mil",
    dias: 18,
    risco: "Medio",
    causa: "Aguardando conferencia de nota fiscal.",
  },
  {
    om: "13 Cia DQBRN",
    uasg: "160148",
    classe: "Classe II",
    credito: "R$ 1,12 mi",
    empenhado: "R$ 890 mil",
    liquidado: "R$ 890 mil",
    pendente: "R$ 0",
    dias: 0,
    risco: "Normal",
    causa: "Execucao sem pendencia relevante.",
  },
  {
    om: "3 B Av Ex",
    uasg: "160149",
    classe: "Classe IX",
    credito: "R$ 2,76 mi",
    empenhado: "R$ 1,98 mi",
    liquidado: "R$ 1,21 mi",
    pendente: "R$ 770 mil",
    dias: 42,
    risco: "Alto",
    causa: "Material recebido sem documento de recebimento definitivo.",
  },
];

const commandQueue = [
  "Priorizar contato com OM com empenhos acima de 30 dias sem liquidacao.",
  "Cruzar NEs pendentes com contratos, notas fiscais e registros de recebimento.",
  "Solicitar justificativa objetiva para pendencias sem evidencia documental.",
  "Separar alertas por classe de suprimento para briefing do Comando.",
];

function riskClass(risk: string) {
  if (risk === "Alto") return "bg-red-50 text-red-700 border-red-100";
  if (risk === "Medio") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
}

export default function BudgetExecutionPage() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-radar-dark">Execução Orçamentária</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Visao gerencial demonstrativa do CCOL para acompanhamento de creditos,
            empenhos e riscos de liquidacao por OM, UASG e classe de suprimento.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm">
          <BarChart3 className="h-4 w-4 text-radar-gold" />
          Dados demonstrativos
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-radar-dark">{item.value}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </div>
              <div className={`rounded-lg border p-2 ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-radar-dark">Execucao Orcamentaria Por OM</h2>
              <p className="text-xs text-slate-500">Credito, empenho, liquidacao e inferencia inicial de risco.</p>
            </div>
            <FileSearch className="h-5 w-5 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">OM / UASG</th>
                  <th className="px-4 py-3 font-bold">Classe</th>
                  <th className="px-4 py-3 font-bold">Credito</th>
                  <th className="px-4 py-3 font-bold">Empenhado</th>
                  <th className="px-4 py-3 font-bold">Liquidado</th>
                  <th className="px-4 py-3 font-bold">A liquidar</th>
                  <th className="px-4 py-3 font-bold">Risco</th>
                  <th className="px-4 py-3 font-bold">Causa provavel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {executionRows.map((row) => (
                  <tr key={row.uasg} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-bold text-radar-dark">{row.om}</p>
                      <p className="text-xs text-slate-500">UASG {row.uasg}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{row.classe}</td>
                    <td className="px-4 py-4 text-slate-600">{row.credito}</td>
                    <td className="px-4 py-4 text-slate-600">{row.empenhado}</td>
                    <td className="px-4 py-4 text-slate-600">{row.liquidado}</td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800">{row.pendente}</p>
                      <p className="text-xs text-slate-500">{row.dias} dias</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${riskClass(row.risco)}`}>
                        {row.risco}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-4 py-4 text-xs leading-relaxed text-slate-500">{row.causa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-radar-dark">Analise Colosso</h2>
              <PackageCheck className="h-5 w-5 text-radar-gold" />
            </div>
            <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                <p className="text-sm font-semibold text-amber-800">
                  Dois atrasos relevantes concentram R$ 1,58 mi a liquidar em Classe III e Classe IX.
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A primeira heuristica sugere pendencias no recebimento definitivo e na juntada documental.
              O proximo passo e cruzar NE, contrato, nota fiscal e registro de entrada de material.
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-radar-dark">Fila de Comando</h2>
            <div className="mt-3 space-y-2">
              {commandQueue.map((item) => (
                <div key={item} className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="text-xs leading-relaxed text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-radar-dark p-4 text-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-white/50">Proximo modulo</p>
                <h2 className="mt-1 text-base font-bold">Integracao SIAFI / Compras.gov</h2>
              </div>
              <ArrowUpRight className="h-5 w-5 text-radar-gold" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/65">
              O painel ja esta preparado para receber dados reais de UASG, empenho,
              liquidacao e contratos assim que conectarmos as fontes oficiais.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
