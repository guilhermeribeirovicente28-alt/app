import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { WEEKDAYS } from "@/lib/constants";
import { useMeta } from "@/lib/useMeta";

const KIND = {
  estudo: { label: "Estudo", c: "#8cc4ff", to: (t) => `/ferramentas/aprender?topic=${encodeURIComponent(t.topic)}` },
  treino: { label: "Treino", c: "#c6ef5e", to: () => "/treino" },
  revisao: { label: "Revisão", c: "#f0c166", to: (t) => `/ferramentas/aprender?topic=${encodeURIComponent(t.topic)}` },
  simulado: { label: "Simulado", c: "#c3a2ff", to: () => "/simulado" },
};
const fmt = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

function PlanForm({ onCreated }) {
  const meta = useMeta();
  const [f, setF] = useState({ exam_name: "ENEM", exam_date: "", subjects: [], minutes_per_day: 60, weekdays: [0, 1, 2, 3, 4] });
  const [busy, setBusy] = useState(false);
  const toggle = (k, v) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.subjects.length || !f.weekdays.length) return toast.error("Escolha ao menos uma matéria e um dia da semana.");
    setBusy(true);
    try {
      const { data } = await api.post("/plan", f);
      toast.success("Plano criado! Bora pra cima.");
      onCreated(data);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="panel p-5 sm:p-7 grid gap-5 rise" data-testid="plan-form">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Qual prova?
          <input className="field" required value={f.exam_name} onChange={(e) => setF({ ...f, exam_name: e.target.value })} data-testid="plan-exam-name-input" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Data da prova
          <input className="field" type="date" required value={f.exam_date} onChange={(e) => setF({ ...f, exam_date: e.target.value })} data-testid="plan-exam-date-input" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Tempo por dia
          <select className="field" value={f.minutes_per_day} onChange={(e) => setF({ ...f, minutes_per_day: Number(e.target.value) })} data-testid="plan-minutes-select">
            {[30, 45, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60}h` : `${m} min`}</option>)}
          </select>
        </label>
      </div>
      <div>
        <span className="text-xs font-semibold text-[#a5bab8]">Matérias</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {meta.plan_subjects.map((s) => <button type="button" key={s} className="chip" aria-pressed={f.subjects.includes(s)} onClick={() => toggle("subjects", s)} data-testid={`plan-subject-${s}`}>{s}</button>)}
        </div>
      </div>
      <div>
        <span className="text-xs font-semibold text-[#a5bab8]">Dias de estudo</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => <button type="button" key={d} className="chip" aria-pressed={f.weekdays.includes(i)} onClick={() => toggle("weekdays", i)} data-testid={`plan-weekday-${i}`}>{d}</button>)}
        </div>
      </div>
      <button className="btn-lime self-start" disabled={busy} data-testid="plan-submit-button"><CalendarDays className="h-4 w-4" />{busy ? "Montando…" : "Montar meu cronograma"}</button>
    </form>
  );
}

function TaskRow({ t, onToggle }) {
  const k = KIND[t.kind];
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-[#373b3b] bg-[#262a2b]/50 px-3 py-2.5 transition-opacity ${t.done ? "opacity-60" : ""}`} data-testid={`plan-task-${t.id}`}>
      <button onClick={() => onToggle(t)} aria-label="Marcar tarefa" data-testid={`plan-task-toggle-${t.id}`}
        className={`h-6 w-6 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${t.done ? "bg-[#c6ef5e] border-[#c6ef5e]" : "border-[#a5bab8]/50 hover:border-[#c6ef5e]"}`}>
        {t.done && <Check className="h-4 w-4 text-[#0f151b]" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${t.done ? "line-through text-[#a5bab8]" : "text-[#eef5f0]"}`}>{t.title}</div>
        <div className="text-xs text-[#a5bab8]"><span style={{ color: k.c }}>{k.label}</span> · {t.subj} · {t.minutes} min</div>
      </div>
      {!t.done && <Link to={k.to(t)} className="rounded-lg p-1.5 text-[#a5bab8] hover:text-[#c6ef5e]" aria-label="Ir" data-testid={`plan-task-go-${t.id}`}><ArrowRight className="h-4 w-4" /></Link>}
    </div>
  );
}

function PlanView({ plan, today, onToggle, onReset }) {
  const [showAll, setShowAll] = useState(false);
  const all = plan.days.flatMap((d) => d.tasks);
  const done = all.filter((t) => t.done).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const left = Math.max(0, Math.ceil((new Date(`${plan.exam_date}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000));
  const upcoming = plan.days.filter((d) => d.date >= today);
  const late = plan.days.filter((d) => d.date < today && d.tasks.some((t) => !t.done));
  const list = showAll ? upcoming : upcoming.slice(0, 7);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5 glow-lime sm:col-span-1" data-testid="plan-countdown">
          <span className="eyebrow">{plan.exam_name}</span>
          <div className="mt-2 font-mono-num text-5xl font-bold text-[#c6ef5e]">{left}</div>
          <div className="text-xs text-[#a5bab8]">dias até {fmt(plan.exam_date)}</div>
        </div>
        <div className="panel p-5 sm:col-span-2" data-testid="plan-progress">
          <div className="flex justify-between text-sm"><span className="font-bold text-[#eef5f0]">Progresso do plano</span><span className="font-mono-num text-[#c6ef5e]">{pct}%</span></div>
          <div className="mt-3 h-2.5 rounded-full bg-[#262a2b] overflow-hidden"><div className="h-full bg-gradient-to-r from-[#8fe0a0] to-[#c6ef5e] transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-xs text-[#a5bab8]">{done} de {all.length} tarefas · {plan.minutes_per_day} min por dia · {plan.subjects.join(", ")}</p>
        </div>
      </div>
      {late.length > 0 && (
        <div className="panel p-4 border-[#f0c166]/40" data-testid="plan-late">
          <p className="text-sm text-[#f0c166] font-semibold">Você tem tarefas atrasadas em {late.length} dia(s). Sem culpa: encaixe hoje o que der.</p>
          <div className="mt-3 grid gap-2">{late.slice(-2).flatMap((d) => d.tasks.filter((t) => !t.done)).map((t) => <TaskRow key={t.id} t={t} onToggle={onToggle} />)}</div>
        </div>
      )}
      {list.map((d) => (
        <div key={d.date} className={`panel p-4 sm:p-5 ${d.date === today ? "border-[#c6ef5e]/50" : ""}`} data-testid={`plan-day-${d.date}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[#eef5f0] capitalize">{d.date === today ? "Hoje" : fmt(d.date)}</span>
            <span className="font-mono-num text-xs text-[#a5bab8]">{d.tasks.filter((t) => t.done).length}/{d.tasks.length}</span>
          </div>
          <div className="grid gap-2">{d.tasks.map((t) => <TaskRow key={t.id} t={t} onToggle={onToggle} />)}</div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        {upcoming.length > 7 && <button className="btn-soft" onClick={() => setShowAll(!showAll)} data-testid="plan-toggle-all">{showAll ? "Mostrar menos" : `Ver todos os ${upcoming.length} dias`}</button>}
        <button className="btn-soft text-[#ff8a70]" onClick={onReset} data-testid="plan-reset-button"><RotateCcw className="h-4 w-4" />Refazer plano</button>
      </div>
    </div>
  );
}

export default function Plano() {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    api.get("/plan").then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);
  const plan = data?.plan;
  const toggle = async (t) => {
    const days = plan.days.map((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }));
    setData({ ...data, plan: { ...plan, days } });
    if (!t.done) toast.success("Tarefa concluída!");
    await api.patch(`/plan/tasks/${t.id}`, { done: !t.done }).catch((e) => toast.error(errMsg(e)));
  };
  const reset = async () => {
    if (!window.confirm("Apagar o plano atual e montar outro?")) return;
    await api.delete("/plan");
    setData({ ...data, plan: null });
  };
  const header = useMemo(() => (
    <div>
      <span className="eyebrow">Cronograma</span>
      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#eef5f0]">Plano de estudos</h1>
      <p className="mt-1 text-sm text-[#a5bab8]">Estudo, treino, revisão espaçada e simulados semanais, distribuídos até o dia da prova.</p>
    </div>
  ), []);
  return (
    <div className="flex flex-col gap-6" data-testid="plan-page">
      {header}
      {data === undefined && <div className="panel h-60 animate-pulse" />}
      {data && !plan && <PlanForm onCreated={setData} />}
      {plan && <PlanView plan={plan} today={data.today} onToggle={toggle} onReset={reset} />}
    </div>
  );
}
