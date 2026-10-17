import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { QuestionCard } from "@/components/QuestionCard";
import { ErrTag } from "@/components/ErrTag";
import { api, errMsg } from "@/lib/api";
import { GRADES } from "@/lib/constants";
import { useMeta } from "@/lib/useMeta";

function EmptyPool({ filter, subj, subjects, onGenerated }) {
  const [s, setS] = useState(subj !== "Todas" ? subj : subjects[0] || "Matemática");
  const [busy, setBusy] = useState(false);
  if (filter === "Revanche") {
    return <div className="panel p-6 text-sm text-[#a5bab8]" data-testid="train-empty">Nenhum erro para revanchear ainda. As questões que você errar aparecem aqui.</div>;
  }
  const gen = async () => {
    setBusy(true);
    try {
      await api.post("/ai/questions", { subj: s, grade: filter === "Todas" ? "ENEM" : filter, topic: "", level: 2, n: 5 });
      toast.success("5 questões novas criadas pela IA!");
      onGenerated();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel p-6 sm:p-8 rise" data-testid="train-empty">
      <Sparkles className="h-6 w-6 text-[#c6ef5e]" />
      <p className="mt-3 font-bold text-[#eef5f0]">Ainda não há questões neste filtro.</p>
      <p className="mt-1 text-sm text-[#a5bab8]">Peça para a IA criar 5 questões inéditas para {filter === "Todas" ? "você" : filter}.</p>
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <input className="field sm:max-w-xs" value={s} onChange={(e) => setS(e.target.value)} list="train-subj-list" placeholder="Matéria" data-testid="train-generate-subject" />
        <datalist id="train-subj-list">{subjects.map((x) => <option key={x} value={x} />)}</datalist>
        <button className="btn-lime" onClick={gen} disabled={busy || !s.trim()} data-testid="train-generate-button">
          {busy ? "Gerando… (até 30s)" : "Gerar com IA"}<Sparkles className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Result({ q, picked, usedHint, onNext }) {
  const ok = picked === q.ans;
  return (
    <div className="mt-6 border-t border-[#373b3b] pt-5 flex flex-col gap-3 rise" data-testid="train-result">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className={ok ? "text-[#8fe0a0]" : "text-[#ff8a70]"} data-testid="train-result-label">
          {ok ? `Acertou! +${usedHint ? 5 : 10} XP` : "Não foi dessa vez."}
        </b>
        {!ok && <ErrTag t={q.err[picked]} />}
      </div>
      <p className="text-sm text-[#a5bab8] leading-relaxed" data-testid="train-explanation">{q.why}</p>
      <button className="btn-lime self-start" onClick={onNext} data-testid="train-next-button">Próxima questão<ArrowRight className="h-4 w-4" /></button>
    </div>
  );
}

export default function Train() {
  const { user } = useAuth();
  const { reloadStats } = useOutletContext();
  const meta = useMeta();
  const [filter, setFilter] = useState("Todas");
  const [subj, setSubj] = useState("Todas");
  const [q, setQ] = useState(undefined);
  const [picked, setPicked] = useState(null);
  const [hint, setHint] = useState(false);
  const chips = ["Todas", "Revanche", user.grade, ...GRADES.filter((g) => g !== user.grade)];

  const load = useCallback(async (exclude) => {
    const { data } = await api.get("/train/next", { params: { filter, subj, exclude } });
    setQ(data.question);
    setPicked(null);
    setHint(false);
  }, [filter, subj]);

  useEffect(() => {
    load(null).catch((e) => toast.error(errMsg(e)));
  }, [load]);

  const pick = async (i) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === q.ans;
    await api.post("/attempts", { mode: "treino", entries: [{ question_id: q.id, correct: ok, err: ok ? null : q.err[i], used_hint: hint }] }).catch(() => {});
    reloadStats();
  };

  return (
    <div className="flex flex-col gap-5" data-testid="train-page">
      <div>
        <span className="eyebrow">Treino adaptativo</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#eef5f0]">Treino</h1>
        <p className="mt-1 text-sm text-[#a5bab8]">A próxima questão é escolhida pelos conteúdos em que você mais erra.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {chips.map((c) => (
          <button key={c} className="chip" aria-pressed={filter === c} onClick={() => setFilter(c)} data-testid={`train-filter-${c.replace(/\s|º/g, "")}`}>{c}</button>
        ))}
      </div>
      <select className="field sm:max-w-xs" value={subj} onChange={(e) => setSubj(e.target.value)} data-testid="train-subject-select">
        {["Todas", ...meta.subjects].map((s) => <option key={s} value={s}>{s === "Todas" ? "Todas as matérias" : s}</option>)}
      </select>
      {q === undefined && <div className="panel h-72 animate-pulse" />}
      {q === null && <EmptyPool filter={filter} subj={subj} subjects={meta.subjects} onGenerated={() => load(null)} />}
      {q && (
        <QuestionCard key={q.id} q={q} picked={picked} onPick={pick}>
          {picked === null && (
            <button onClick={() => setHint(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#373b3b] px-3 py-2 text-sm text-[#a5bab8] hover:text-[#eef5f0] transition-colors" data-testid="train-hint-button">
              <Lightbulb className="h-4 w-4 text-[#f0c166]" />{hint ? "Dica aberta (vale 5 XP)" : "Ver dica"}
            </button>
          )}
          {picked === null && hint && <p className="mt-3 rounded-xl bg-[#262a2b] p-3.5 text-sm text-[#eef5f0]" data-testid="train-hint-text">{q.hint}</p>}
          {picked !== null && <Result q={q} picked={picked} usedHint={hint} onNext={() => load(q.id)} />}
        </QuestionCard>
      )}
    </div>
  );
}
