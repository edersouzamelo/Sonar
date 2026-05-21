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
    label: "OM mapeadas",
    value: "47",
    detail: "CMO, GU, Gpt e vinculadas",
    icon: Banknote,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    label: "UASG validadas",
    value: "0",
    detail: "pendente de base oficial",
    icon: FileSearch,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    label: "Fontes futuras",
    value: "2",
    detail: "SIAFI e Compras.gov",
    icon: TrendingUp,
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    label: "Alertas ativos",
    value: "7",
    detail: "demonstrativo +30 dias",
    icon: ShieldAlert,
    tone: "bg-red-50 text-red-700 border-red-100",
  },
];

const cmoOrganizations = [
  { group: "CMO - Diretas", om: "Base de Administracao e Apoio do CMO", city: "Campo Grande", uf: "MS" },
  { group: "CMO - Diretas", om: "Campo de Instrucao de Betione", city: "Campo Grande", uf: "MS" },
  { group: "CMO - Diretas", om: "3 Batalhao de Aviacao do Exercito", city: "Campo Grande", uf: "MS" },
  { group: "CMO - Diretas", om: "6 Batalhao de Inteligencia Militar", city: "Campo Grande", uf: "MS" },
  { group: "CMO - Diretas", om: "9 Batalhao de Comunicacoes e Guerra Eletronica", city: "Campo Grande", uf: "MS" },
  { group: "CMO - Diretas", om: "9 Batalhao de Policia do Exercito", city: "Campo Grande", uf: "MS" },

  { group: "9 Regiao Militar", om: "Comando da 9 Regiao Militar", city: "Campo Grande", uf: "MS" },
  { group: "9 Regiao Militar", om: "Hospital Militar de Area de Campo Grande", city: "Campo Grande", uf: "MS" },
  { group: "9 Regiao Militar", om: "Tiro de Guerra de Sinop", city: "Sinop", uf: "MT" },
  { group: "9 Regiao Militar", om: "Tiro de Guerra de Alta Floresta", city: "Alta Floresta", uf: "MT" },
  { group: "9 Regiao Militar", om: "Tiro de Guerra de Juara", city: "Juara", uf: "MT" },
  { group: "9 Regiao Militar", om: "Tiro de Guerra de Colider", city: "Colider", uf: "MT" },

  { group: "4 Bda C Mec", om: "Esquadrao de Comando da 4 Brigada de Cavalaria Mecanizada", city: "Dourados", uf: "MS" },
  { group: "4 Bda C Mec", om: "10 Regimento de Cavalaria Mecanizado", city: "Bela Vista", uf: "MS" },
  { group: "4 Bda C Mec", om: "11 Regimento de Cavalaria Mecanizado", city: "Ponta Pora", uf: "MS" },
  { group: "4 Bda C Mec", om: "17 Regimento de Cavalaria Mecanizado", city: "Amambai", uf: "MS" },
  { group: "4 Bda C Mec", om: "20 Regimento de Cavalaria Blindado", city: "Campo Grande", uf: "MS" },
  { group: "4 Bda C Mec", om: "9 Grupo de Artilharia de Campanha", city: "Nioaque", uf: "MS" },
  { group: "4 Bda C Mec", om: "28 Batalhao Logistico", city: "Dourados", uf: "MS" },
  { group: "4 Bda C Mec", om: "3 Bateria de Artilharia Antiaerea", city: "Tres Lagoas", uf: "MS" },
  { group: "4 Bda C Mec", om: "4 Companhia de Engenharia de Combate Mecanizada", city: "Jardim", uf: "MS" },
  { group: "4 Bda C Mec", om: "14 Companhia de Comunicacoes Mecanizada", city: "Dourados", uf: "MS" },
  { group: "4 Bda C Mec", om: "4 Pelotao de Policia do Exercito Mecanizado", city: "Dourados", uf: "MS" },

  { group: "13 Bda Inf Mtz", om: "Companhia de Comando da 13 Brigada de Infantaria Motorizada", city: "Cuiaba", uf: "MT" },
  { group: "13 Bda Inf Mtz", om: "44 Batalhao de Infantaria Motorizado", city: "Cuiaba", uf: "MT" },
  { group: "13 Bda Inf Mtz", om: "58 Batalhao de Infantaria Motorizado", city: "Aragarcas", uf: "GO" },
  { group: "13 Bda Inf Mtz", om: "Comando de Fronteira Jauru / 66 Batalhao de Infantaria Motorizado", city: "Caceres", uf: "MT" },
  { group: "13 Bda Inf Mtz", om: "18 Grupo de Artilharia de Campanha", city: "Rondonopolis", uf: "MT" },
  { group: "13 Bda Inf Mtz", om: "13 Pelotao de Policia do Exercito", city: "Cuiaba", uf: "MT" },
  { group: "13 Bda Inf Mtz", om: "13 Pelotao de Comunicacoes", city: "Cuiaba", uf: "MT" },

  { group: "18 Bda Inf Pan", om: "Companhia de Comando da 18 Brigada de Infantaria de Pantanal", city: "Corumba", uf: "MS" },
  { group: "18 Bda Inf Pan", om: "17 Batalhao de Fronteira", city: "Corumba", uf: "MS" },
  { group: "18 Bda Inf Pan", om: "47 Batalhao de Infantaria", city: "Coxim", uf: "MS" },
  { group: "18 Bda Inf Pan", om: "2 Companhia de Fronteira", city: "Porto Murtinho", uf: "MS" },
  { group: "18 Bda Inf Pan", om: "18 Companhia de Comunicacoes", city: "Corumba", uf: "MS" },
  { group: "18 Bda Inf Pan", om: "18 Pelotao de Policia do Exercito", city: "Corumba", uf: "MS" },

  { group: "3 Gpt E", om: "Comando do 3 Grupamento de Engenharia", city: "Campo Grande", uf: "MS" },
  { group: "3 Gpt E", om: "9 Batalhao de Engenharia de Combate", city: "Aquidauana", uf: "MS" },
  { group: "3 Gpt E", om: "9 Batalhao de Engenharia de Construcao", city: "Cuiaba", uf: "MT" },
  { group: "3 Gpt E", om: "Comissao Regional de Obras / 3 Grupamento de Engenharia", city: "Campo Grande", uf: "MS" },

  { group: "9 Gpt Log", om: "Companhia de Comando do 9 Grupamento Logistico", city: "Campo Grande", uf: "MS" },
  { group: "9 Gpt Log", om: "9 Batalhao de Suprimento", city: "Campo Grande", uf: "MS" },
  { group: "9 Gpt Log", om: "9 Batalhao de Manutencao", city: "Campo Grande", uf: "MS" },
  { group: "9 Gpt Log", om: "18 Batalhao de Transporte", city: "Campo Grande", uf: "MS" },
  { group: "9 Gpt Log", om: "9 Batalhao de Saude", city: "Campo Grande", uf: "MS" },

  { group: "Vinculadas", om: "9 Centro de Gestao, Contabilidade e Financas do Exercito", city: "Campo Grande", uf: "MS" },
  { group: "Vinculadas", om: "6 Centro de Telematica de Area", city: "Campo Grande", uf: "MS" },
  { group: "Vinculadas", om: "Colegio Militar de Campo Grande", city: "Campo Grande", uf: "MS" },
];

const commandQueue = [
  "Validar UASG de cada OM em base oficial antes de integrar execucao financeira.",
  "Separar OM apoiadas, OM vinculadas e OM diretamente subordinadas no modelo de dados.",
  "Cruzar UASG com classes de suprimento gerenciadas pelo CCOL.",
  "Criar marcador para OM com credito recebido, empenhado e liquidacao pendente.",
];

export default function Dashboard() {
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-radar-dark">Organizações Militares</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Visao gerencial demonstrativa do CCOL para acompanhamento de OM, UASG,
            creditos, empenhos e riscos de liquidacao por classe de suprimento.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm">
          <BarChart3 className="h-4 w-4 text-radar-gold" />
          Base inicial publica
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
              <h2 className="text-base font-bold text-radar-dark">OM / UASG Do Comando Militar Do Oeste</h2>
              <p className="text-xs text-slate-500">
                Relacao inicial de organizacoes militares do CMO. Codigos UASG entram apos validacao.
              </p>
            </div>
            <FileSearch className="h-5 w-5 text-slate-400" />
          </div>
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Grande comando</th>
                  <th className="px-4 py-3 font-bold">Organizacao Militar</th>
                  <th className="px-4 py-3 font-bold">Guarnicao</th>
                  <th className="px-4 py-3 font-bold">UASG</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cmoOrganizations.map((row) => (
                  <tr key={`${row.group}-${row.om}`} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">{row.group}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-radar-dark">{row.om}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.city} / {row.uf}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-500">
                        A validar
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        Mapeada
                      </span>
                    </td>
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
                  O primeiro risco de dados e a UASG: nao devemos inferir codigo financeiro sem fonte validada.
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              A relacao de OM ja permite estruturar o modulo. O proximo passo e
              enriquecer cada linha com UASG, classe de suprimento apoiada,
              credito recebido, empenhado, liquidado e saldo a liquidar.
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
              Com a tabela de OM estabilizada, o SONAR passa a ter uma base para
              consultas por UASG, notas de empenho e pendencias de liquidacao.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
