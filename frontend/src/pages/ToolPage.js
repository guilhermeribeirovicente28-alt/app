import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { TOOLS } from "@/pages/Tools";
import Aprender from "@/pages/tools/Aprender";
import GerarQuestoes from "@/pages/tools/GerarQuestoes";
import Material from "@/pages/tools/Material";
import Fabricante from "@/pages/tools/Fabricante";
import RaioX from "@/pages/tools/RaioX";
import Pegadinha from "@/pages/tools/Pegadinha";
import CriarQuestao from "@/pages/tools/CriarQuestao";

const MAP = { aprender: Aprender, gerar: GerarQuestoes, upload: Material, fabricante: Fabricante, raiox: RaioX, pegadinha: Pegadinha, criar: CriarQuestao };

export default function ToolPage() {
  const { tool } = useParams();
  const t = TOOLS.find((x) => x.id === tool);
  const Body = MAP[tool];
  if (!t || !Body) return <Navigate to="/ferramentas" replace />;
  return (
    <div className="flex flex-col gap-5" data-testid={`tool-page-${tool}`}>
      <Link to="/ferramentas" className="inline-flex items-center gap-1.5 self-start text-sm text-[#a5bab8] hover:text-[#eef5f0] transition-colors" data-testid="tool-back-link">
        <ArrowLeft className="h-4 w-4" />Ferramentas
      </Link>
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#c6ef5e]/10 border border-[#c6ef5e]/30 flex items-center justify-center">
          <t.icon className="h-6 w-6 text-[#c6ef5e]" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#eef5f0]">{t.n}</h1>
          <p className="mt-1 text-sm text-[#a5bab8]">{t.d}</p>
        </div>
      </div>
      <Body />
    </div>
  );
}
