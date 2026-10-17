import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight, BookOpenCheck, CalendarDays, MessageCircle, Sparkles, Timer, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StatTiles } from "@/components/StatTiles";
import { api } from "@/lib/api";

const ACTIONS = [
  { to: "/treino", icon: BookOpenCheck, t: "Começar treino", d: "Questões escolhidas pelo seu desempenho", key: "treino", primary: true },
  { to: "/simulado", icon: Timer, t: "Fazer simulado", d: "Cronometrado, com revisão no fim", key: "simulado" },
  { to: "/professor", icon: MessageCircle, t: "Perguntar ao Professor", d: "Tutor IA para qualquer matéria", key: "professor" },
  { to: "/ferramentas/gerar", icon: Sparkles, t: "Gerar questões com IA", d: "Inéditas, no seu assunto e série", key: "gerar" },
];

function GoalRing({ today }) {
  const pct = Math.min(100, Math.round(((today?.answered || 0) / (today?.goal || 10)) * 100));
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="panel p-5 sm:p-6 flex items-center gap-5" data-testid="daily-goal-card">
      <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0 -rotate-90">
        <circle cx="42" cy="42" r={r} stroke="#262a2b" strokeWidth="8" fill="none" />
        <circle cx="42" cy="42" r={r} stroke="#c6ef5e" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div>
        <span className="eyebrow">Meta do dia</span>
        <div className="mt-1 font-mono-num text-2xl font-bold text-[#eef5f0]" data-testid="daily-goal-value">{today?.answered || 0}/{today?.goal || 10}</div>
        <p className="text-xs text-[#a5bab8]">{pct >= 100 ? "Meta batida! Continue assim." : "questões respondidas hoje"}</p>
      </div>
    </div>
  );
}

function TodayPlan({ plan, today }) {
  if (!plan) {
    return (
      <Link to="/plano" className="panel p-5 sm:p-6 block hover:border-[#c6ef5e]/40 transition-colors" data-testid="dashboard-create-plan">
        <CalendarDays className="h-5 w-5 text-[#c6ef5e]" />
        <div className="mt-3 font-bold text-[#eef5f0]">Monte seu plano de estudos</div>
        <p className="text-sm text-[#a5bab8] mt-1">Diga a data da prova e quanto tempo tem por dia. A gente organiza o resto.</p>
      </Link>
    );
  }
  const day = plan.days.find((d) => d.date >= today);
  const left = Math.max(0, Math.ceil((new Date(plan.exam_date) - new Date(today)) / 86400000));
  return (
    <Link to="/plano" className="panel p-5 sm:p-6 block hover:border-[#c6ef5e]/40 transition-colors" data-testid="dashboard-plan-card">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{plan.exam_name}</span>
        <span className="font-mono-num text-xs font-bold text-[#f0c166]">faltam {left} dias</span>
      </div>
      <div className="mt-3 text-sm font-bold text-[#eef5f0]">{day?.date === today ? "Tarefas de hoje" : "Próximo dia de estudo"}</div>
      <ul className="mt-2 grid gap-1.5">
        {(day?.tasks || []).map((t) => (
          <li key={t.id} className={`text-sm flex items-center gap-2 ${t.done ? "text-[#a5bab8] line-through" : "text-[#eef5f0]"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${t.done ? "bg-[#8fe0a0]" : "bg-[#c6ef5e]"}`} />{t.title} · {t.minutes} min
          </li>
        ))}
      </ul>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { stats } = useOutletContext();
  const [plan, setPlan] = useState({ plan: null, today: "" });
  useEffect(() => {
    api.get("/plan").then((r) => setPlan(r.data)).catch(() => {});
  }, []);
  const weak = (stats?.topics || []).filter((t) => t.n >= 2).slice(0, 3);
  return (
    <div className="flex flex-col gap-6 sm:gap-8" data-testid="dashboard-page">
      <div className="rise">
        <span className="eyebrow">Início</span>
        <h1 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#eef5f0]" data-testid="dashboard-greeting">
          Bora, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#a5bab8]">Treine, descubra por que você erra e transforme erro em acerto.</p>
      </div>
      <StatTiles s={stats} />
      <div className="grid gap-4 md:grid-cols-2">
        <GoalRing today={stats?.today} />
        <div className="panel p-5 sm:p-6" data-testid="level-card">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Nível {stats?.level || 1}</span>
            <Trophy className="h-4 w-4 text-[#f0c166]" />
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-[#262a2b] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8fe0a0] to-[#c6ef5e] shadow-[0_0_12px_rgba(198,239,94,0.5)] transition-[width] duration-500" style={{ width: `${stats?.level_progress || 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#a5bab8]"><span className="font-mono-num text-[#eef5f0]">{stats?.xp_to_next ?? 150} XP</span> para o nível {(stats?.level || 1) + 1}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACTIONS.map((a, i) => (
          <Link key={a.key} to={a.to} data-testid={`quick-action-${a.key}`} style={{ animationDelay: `${i * 60}ms` }}
            className={`rise group flex items-center gap-4 rounded-2xl border p-4 sm:p-5 transition-colors duration-200 ${a.primary ? "bg-[#c6ef5e] border-[#c6ef5e] text-[#0f151b]" : "bg-[#1b1e20] border-[#373b3b] hover:border-[#a5bab8]/50"}`}>
            <a.icon className={`h-5 w-5 shrink-0 ${a.primary ? "" : "text-[#c6ef5e]"}`} />
            <div className="min-w-0 flex-1">
              <div className={`font-bold ${a.primary ? "" : "text-[#eef5f0]"}`}>{a.t}</div>
              <div className={`text-xs ${a.primary ? "text-[#0f151b]/70" : "text-[#a5bab8]"}`}>{a.d}</div>
            </div>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TodayPlan plan={plan.plan} today={plan.today} />
        <div className="panel p-5 sm:p-6" data-testid="weak-topics-card">
          <span className="eyebrow">Seus inimigos</span>
          {weak.length === 0 ? (
            <p className="mt-3 text-sm text-[#a5bab8]">Responda algumas questões e mostramos aqui os conteúdos que mais te derrubam.</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {weak.map((t) => (
                <li key={t.topic}>
                  <div className="flex justify-between text-sm"><span className="text-[#eef5f0] font-semibold">{t.topic}</span><span className="font-mono-num text-[#ff8a70]">{t.pct}%</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#262a2b] overflow-hidden"><div className="h-full bg-[#ff8a70]" style={{ width: `${t.pct}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
