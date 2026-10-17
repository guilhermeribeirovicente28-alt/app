import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { ErrTag } from "@/components/ErrTag";
import { api, errMsg } from "@/lib/api";
import { GRADES, LETTERS } from "@/lib/constants";
import { useMeta } from "@/lib/useMeta";

export function GenForm({ onSubmit, busy, cta }) {
  const { user } = useAuth();
  const meta = useMeta();
  const [f, setF] = useState({ subj: "", topic: "", grade: user.grade, level: 2, n: 5 });
  const set = (k, num) => (e) => setF({ ...f, [k]: num ? Number(e.target.value) : e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="panel p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Matéria
        <input className="field" required list="gen-subj" value={f.subj} onChange={set("subj")} placeholder="Ex.: Matemática" data-testid="gen-subject-input" />
        <datalist id="gen-subj">{meta.plan_subjects.map((s) => <option key={s} value={s} />)}</datalist>
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Assunto (opcional)
        <input className="field" value={f.topic} onChange={set("topic")} placeholder="Ex.: Porcentagem" data-testid="gen-topic-input" />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Série
        <select className="field" value={f.grade} onChange={set("grade")} data-testid="gen-grade-select">{GRADES.map((g) => <option key={g}>{g}</option>)}</select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Nível
          <select className="field" value={f.level} onChange={set("level", true)} data-testid="gen-level-select">{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Qtd.
          <select className="field" value={f.n} onChange={set("n", true)} data-testid="gen-count-select">{[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
      </div>
      <button className="btn-lime" disabled={busy || !f.subj.trim()} data-testid="gen-submit-button"><Sparkles className="h-4 w-4" />{busy ? "Gerando… (até 40s)" : cta}</button>
    </form>
  );
}

export default function GerarQuestoes() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [qs, setQs] = useState([]);
  const gen = async (f) => {
    setBusy(true);
    try {
      const { data } = await api.post("/ai/questions", f);
      setQs(data);
      toast.success(`${data.length} questões criadas e salvas no seu banco!`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <GenForm onSubmit={gen} busy={busy} cta="Gerar" />
      {busy && <div className="panel h-40 animate-pulse" data-testid="gen-loading" />}
      {qs.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#a5bab8]">Elas já aparecem no Treino e no Simulado.</p>
            <button className="btn-lime" onClick={() => navigate("/simulado", { state: { ids: qs.map((q) => q.id), label: qs[0].subj } })} data-testid="gen-start-simulado"><Play className="h-4 w-4" />Fazer como simulado</button>
          </div>
          {qs.map((q, i) => (
            <div key={q.id} className="panel p-5 rise" style={{ animationDelay: `${i * 50}ms` }} data-testid={`gen-question-${i}`}>
              <span className="eyebrow">{i + 1}. {q.subj} · {q.topic} · nível {q.level}</span>
              <p className="mt-2 font-semibold text-[#eef5f0]">{q.prompt}</p>
              <ul className="mt-3 grid gap-1.5">
                {q.opts.map((o, k) => (
                  <li key={k} className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm ${k === q.ans ? "bg-[#8fe0a0]/10 text-[#8fe0a0]" : "bg-[#262a2b] text-[#eef5f0]"}`}>
                    <b className="font-mono-num">{LETTERS[k]})</b>{o}{k !== q.ans && <span className="ml-auto"><ErrTag t={q.err[k]} small /></span>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-[#a5bab8]">{q.why}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
