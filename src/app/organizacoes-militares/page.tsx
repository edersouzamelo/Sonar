import { Building2 } from "lucide-react";

export default function OrganizacoesMilitaresPage() {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-radar-dark">Organizacoes Militares</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Modulo em desenvolvimento para acompanhamento das organizacoes militares.
        </p>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-radar-dark shadow-sm">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-yellow-700" />
          <div>
            <h2 className="text-lg font-black uppercase">Em desenvolvimento</h2>
            <p className="mt-1 text-sm text-slate-700">
              Esta area sera consolidada nas proximas atualizacoes do SONAR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
