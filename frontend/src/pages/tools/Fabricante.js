import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { GRADES } from "@/lib/constants";
import { useMeta } from "@/lib/useMeta";
import { GenForm } from "@/pages/tools/GerarQuestoes";

function FromBank() {
  const navigate = useNavigate();
  const meta = useMeta();
  const [f, setF] = useState({ subj: "Todas", grade: "Todas", n: 10 });
  return (
    <div className="panel p-5 grid gap-3 sm:grid-cols-4 sm:items-end">
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Matéria
        <select className="field" value={f.subj} onChange={(e) => setF({ ...f, subj: e.target.value })} data-testid="fab-subject-select">
          {["Todas", ...meta.subjects].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Série
        <select className="field" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} data-testid="fab-grade-select">
          {["Todas", ...GRADES].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Questões
        <select className="field" value={f.n} onChange={(e) => setF({ ...f, n: Number(e.target.value) })} data-testid="fab-count-select">
          {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      <button className="btn-lime" onClick={() => navigate("/simulado", { state: f })} data-testid="fab-bank-submit"><Play className="h-4 w-4" />Montar prova</button>
    </div>
  );
}

export default function Fabricante() {
  const navigate = useNavigate();
  const [src, setSrc] = useState("banco");
  const [busy, setBusy] = useState(false);
  const fromAI = async (f) => {
    setBusy(true);
    try {
      const { data } = await api.post("/ai/questions", f);
      toast.success("Prova inédita pronta. Boa sorte!");
      navigate("/simulado", { state: { ids: data.map((q) => q.id), label: f.subj } });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <button className="chip flex items-center justify-center gap-2 py-2.5" aria-pressed={src === "banco"} onClick={() => setSrc("banco")} data-testid="fab-source-banco"><Database className="h-4 w-4" />Do banco</button>
        <button className="chip flex items-center justify-center gap-2 py-2.5" aria-pressed={src === "ia"} onClick={() => setSrc("ia")} data-testid="fab-source-ia"><Sparkles className="h-4 w-4" />Inédita com IA</button>
      </div>
      {src === "banco" ? <FromBank /> : <GenForm onSubmit={fromAI} busy={busy} cta="Criar prova" />}
    </div>
  );
}
