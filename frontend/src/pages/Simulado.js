import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, ArrowRight, Flag, Timer } from "lucide-react";
import { toast } from "sonner";
import { QuestionCard } from "@/components/QuestionCard";
import { ErrTag } from "@/components/ErrTag";
import { api, errMsg } from "@/lib/api";
import { GRADES, LETTERS, mmss } from "@/lib/constants";
import { useMeta } from "@/lib/useMeta";

function Intro({ onStart, busy }) {
  const meta = useMeta();
  const [f, setF] = useState({ subj: "Todas", grade: "Todas", n: 10 });
  return (
    <div className="flex flex-col gap-5 rise" data-testid="simulado-intro">
      <div>
        <span className="eyebrow">Modo prova</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#eef5f0]">Simulado</h1>
        <p className="mt-1 text-sm text-[#a5bab8]">Sem dica e sem resposta na hora: o resultado e a revisão aparecem no fim.</p>
      </div>
      <div className="panel p-5 sm:p-6 grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Matéria
          <select className="field" value={f.subj} onChange={(e) => setF({ ...f, subj: e.target.value })} data-testid="simulado-subject-select">
            {["Todas", ...meta.subjects].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Série
          <select className="field" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} data-testid="simulado-grade-select">
            {["Todas", ...GRADES].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Questões
          <select className="field" value={f.n} onChange={(e) => setF({ ...f, n: Number(e.target.value) })} data-testid="simulado-count-select">
            {[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <button className="btn-lime self-start" disabled={busy} onClick={() => onStart(f)} data-testid="simulado-start-button">
        <Timer className="h-4 w-4" />{busy ? "Montando…" : "Iniciar simulado"}
      </button>
    </div>
  );
}

function Run({ qs, ans, setAns, elapsed, onFinish }) {
  const [idx, setIdx] = useState(0);
  const q = qs[idx];
  const last = idx === qs.length - 1;
  const answered = ans.filter((a) => a !== null).length;
  return (
    <div className="flex flex-col gap-4" data-testid="simulado-run">
      <div className="flex items-center justify-between">
        <b className="text-[#eef5f0]" data-testid="simulado-counter">Questão {idx + 1} de {qs.length}</b>
        <span className="font-mono-num text-sm text-[#c6ef5e] inline-flex items-center gap-1.5" data-testid="simulado-timer"><Timer className="h-4 w-4" />{mmss(elapsed)}</span>
      </div>
      <div className="flex gap-1">
        {qs.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`Ir para questão ${i + 1}`} data-testid={`simulado-jump-${i + 1}`}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i === idx ? "bg-[#c6ef5e]" : ans[i] !== null ? "bg-[#8fe0a0]/60" : "bg-[#262a2b]"}`} />
        ))}
      </div>
      <QuestionCard key={q.id} q={q} picked={ans[idx]} reveal={false} onPick={(i) => setAns((a) => a.map((x, k) => (k === idx ? i : x)))} />
      <div className="flex items-center justify-between gap-3">
        <button className="btn-soft" disabled={idx === 0} onClick={() => setIdx(idx - 1)} data-testid="simulado-prev-button"><ArrowLeft className="h-4 w-4" />Anterior</button>
        {last ? (
          <button className="btn-lime" onClick={onFinish} data-testid="simulado-finish-button"><Flag className="h-4 w-4" />Finalizar ({answered}/{qs.length})</button>
        ) : (
          <button className="btn-soft" onClick={() => setIdx(idx + 1)} data-testid="simulado-next-button">Próxima<ArrowRight className="h-4 w-4" /></button>
        )}
      </div>
    </div>
  );
}

function Review({ qs, ans, elapsed, onAgain }) {
  const hits = qs.filter((q, i) => ans[i] === q.ans).length;
  const pct = Math.round((hits / qs.length) * 100);
  return (
    <div className="flex flex-col gap-5 rise" data-testid="simulado-result">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#eef5f0]">Resultado</h1>
      <div className="panel p-6 flex flex-wrap items-end justify-between gap-4 glow-lime">
        <div>
          <span className="font-mono-num text-6xl font-bold text-[#c6ef5e]" data-testid="simulado-hits">{hits}</span>
          <span className="font-mono-num text-2xl font-bold text-[#a5bab8]"> / {qs.length}</span>
        </div>
        <div className="text-right text-sm text-[#a5bab8]">
          <div className="text-[#eef5f0] font-bold" data-testid="simulado-pct">{pct}% de acerto</div>
          <div>Tempo {mmss(elapsed)}</div>
        </div>
      </div>
      <h2 className="text-lg font-bold text-[#eef5f0]">Revisão</h2>
      {qs.map((q, i) => {
        const a = ans[i];
        const ok = a === q.ans;
        return (
          <div key={q.id} className={`panel p-4 sm:p-5 border-l-4 ${ok ? "border-l-[#8fe0a0]" : "border-l-[#ff8a70]"}`} data-testid={`simulado-review-${i + 1}`}>
            <span className="eyebrow">{i + 1}. {q.subj} · {q.topic}</span>
            <p className="mt-2 text-[#eef5f0]">{q.prompt}</p>
            <p className="mt-2 text-sm">
              {ok ? <span className="text-[#8fe0a0]">Você marcou {LETTERS[a]}) {q.opts[a]}. Correto.</span> : (
                <><span className="text-[#ff8a70]">{a === null ? "Sem resposta. " : `Você marcou ${LETTERS[a]}) ${q.opts[a]}. `}</span>
                  <span className="text-[#eef5f0]">Certa: {LETTERS[q.ans]}) {q.opts[q.ans]}.</span></>
              )}
            </p>
            {!ok && a !== null && <div className="mt-2"><ErrTag t={q.err[a]} small /></div>}
            <p className="mt-2 text-sm text-[#a5bab8]">{q.why}</p>
          </div>
        );
      })}
      <button className="btn-lime self-start" onClick={onAgain} data-testid="simulado-again-button">Fazer outro simulado</button>
    </div>
  );
}

export default function Simulado() {
  const { reloadStats } = useOutletContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("intro");
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const meta = useRef({ subj: "Todas", t0: 0 });

  const start = async (params) => {
    setBusy(true);
    try {
      const { data } = await api.get("/simulado", { params });
      if (!data.length) {
        toast.error("Nenhuma questão para esse filtro. Gere questões com IA nas Ferramentas.");
        return;
      }
      meta.current = { subj: params.subj || "Personalizado", t0: Date.now() };
      setQs(data);
      setAns(data.map(() => null));
      setElapsed(0);
      setPhase("run");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const st = location.state;
    if (st?.ids || st?.subj) {
      start(st.ids ? { ids: st.ids.join(","), subj: st.label } : st);
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "run") return undefined;
    const id = setInterval(() => setElapsed((Date.now() - meta.current.t0) / 1000), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const finish = async () => {
    const entries = qs.map((q, i) => ({ question_id: q.id, correct: ans[i] === q.ans, err: ans[i] === null || ans[i] === q.ans ? null : q.err[ans[i]] }));
    setElapsed((Date.now() - meta.current.t0) / 1000);
    setPhase("done");
    try {
      const { data } = await api.post("/simulados", { subj: meta.current.subj, seconds: Math.round((Date.now() - meta.current.t0) / 1000), entries });
      toast.success(`Simulado salvo! +${data.xp} XP`);
      reloadStats();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (phase === "run") return <Run qs={qs} ans={ans} setAns={setAns} elapsed={elapsed} onFinish={finish} />;
  if (phase === "done") return <Review qs={qs} ans={ans} elapsed={elapsed} onAgain={() => setPhase("intro")} />;
  return <Intro onStart={start} busy={busy} />;
}
