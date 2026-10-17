import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { StatTiles } from "@/components/StatTiles";
import { api, errMsg } from "@/lib/api";
import { GRADES, TYPES, mmss } from "@/lib/constants";

function XpChart({ daily }) {
  const data = (daily || []).map((d) => ({ ...d, label: new Date(`${d.day}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) }));
  return (
    <div className="panel p-5" data-testid="xp-chart">
      <span className="eyebrow">XP nos últimos 14 dias</span>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fill: "#a5bab8", fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
            <Tooltip cursor={{ fill: "#262a2b" }} contentStyle={{ background: "#1b1e20", border: "1px solid #373b3b", borderRadius: 12, color: "#eef5f0" }} formatter={(v) => [`${v} XP`, ""]} />
            <Bar dataKey="xp" fill="#c6ef5e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ErrBreakdown({ errs }) {
  const total = Object.values(errs || {}).reduce((a, b) => a + b, 0);
  return (
    <div className="panel p-5 flex flex-col gap-4" data-testid="error-breakdown">
      <span className="eyebrow">Por que você erra</span>
      {total === 0 ? <p className="text-sm text-[#a5bab8]">Sem dados ainda. Erros com tipo identificado aparecem aqui.</p> :
        Object.keys(TYPES).map((k) => (
          <div key={k} data-testid={`error-breakdown-${TYPES[k].slug}`}>
            <div className="flex justify-between text-sm"><span className="font-bold" style={{ color: TYPES[k].c }}>{TYPES[k].label}</span><span className="font-mono-num text-[#a5bab8]">{errs[k]} ({Math.round((errs[k] / total) * 100)}%)</span></div>
            <div className="mt-1.5 h-2 rounded-full bg-[#262a2b] overflow-hidden"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(errs[k] / total) * 100}%`, background: TYPES[k].c }} /></div>
          </div>
        ))}
    </div>
  );
}

function Bars({ title, rows, testid }) {
  return (
    <div className="panel p-5 flex flex-col gap-3" data-testid={testid}>
      <span className="eyebrow">{title}</span>
      {rows.length === 0 ? <p className="text-sm text-[#a5bab8]">Responda questões no Treino para ver aqui.</p> : rows.map((r) => (
        <div key={r.k}>
          <div className="flex justify-between text-sm"><span className="text-[#eef5f0] font-semibold">{r.k}{r.sub && <span className="text-[#a5bab8] font-normal"> · {r.sub}</span>}</span><span className="font-mono-num text-[#eef5f0]">{r.pct}%</span></div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[#262a2b] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.pct >= 70 ? "#8fe0a0" : r.pct >= 40 ? "#f0c166" : "#ff8a70" }} /></div>
          <p className="text-[11px] text-[#a5bab8] mt-0.5">{r.ok} de {r.n} certas</p>
        </div>
      ))}
    </div>
  );
}

function Profile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ name: user.name, grade: user.grade });
  const save = async () => {
    try {
      const { data } = await api.patch("/auth/me", f);
      setUser(data);
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <div className="panel p-5 grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end" data-testid="profile-card">
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Nome<input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="profile-name-input" /></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Ano / objetivo
        <select className="field" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} data-testid="profile-grade-select">{GRADES.map((g) => <option key={g}>{g}</option>)}</select>
      </label>
      <button className="btn-soft" onClick={save} data-testid="profile-save-button">Salvar perfil</button>
    </div>
  );
}

export default function Progresso() {
  const { stats, reloadStats } = useOutletContext();
  const [ask, setAsk] = useState(false);
  const reset = async () => {
    await api.delete("/progress");
    setAsk(false);
    reloadStats();
    toast.success("Progresso apagado");
  };
  const s = stats;
  return (
    <div className="flex flex-col gap-5" data-testid="progress-page">
      <div>
        <span className="eyebrow">Raio-X pessoal</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#eef5f0]">Progresso</h1>
      </div>
      <StatTiles s={s} />
      <XpChart daily={s?.daily} />
      <div className="grid gap-4 md:grid-cols-2">
        <ErrBreakdown errs={s?.errs} />
        <Bars title="Matérias" testid="subjects-breakdown" rows={(s?.subjects || []).map((x) => ({ k: x.subj, ...x }))} />
      </div>
      <Bars title="Conteúdos (do mais fraco ao mais forte)" testid="topics-breakdown" rows={(s?.topics || []).map((x) => ({ k: x.topic, sub: x.subj, ...x }))} />
      <div className="panel p-5" data-testid="simulado-history">
        <span className="eyebrow">Últimos simulados</span>
        {(s?.simulados || []).length === 0 ? <p className="mt-3 text-sm text-[#a5bab8]">Nenhum simulado feito ainda.</p> : (
          <div className="mt-3 grid gap-2">
            {s.simulados.map((x) => (
              <div key={x.id} className="flex items-center justify-between rounded-xl bg-[#262a2b] px-4 py-2.5 text-sm">
                <span className="text-[#eef5f0]">{x.subj} · <span className="text-[#a5bab8]">{new Date(x.created_at).toLocaleDateString("pt-BR")}</span></span>
                <span className="font-mono-num"><b className="text-[#c6ef5e]">{x.hits}/{x.total}</b> <span className="text-[#a5bab8]">· {mmss(x.seconds)}</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Profile />
      {!ask ? <button className="btn-soft self-start text-[#ff8a70]" onClick={() => setAsk(true)} data-testid="progress-reset-button">Apagar meu progresso</button> : (
        <div className="panel p-5 flex flex-col gap-3 rise" data-testid="progress-reset-confirm">
          <p className="text-[#eef5f0]">Apagar todo o seu histórico de questões e simulados? Isso não pode ser desfeito.</p>
          <div className="flex gap-2">
            <button className="btn-soft border-[#ff8a70] text-[#ff8a70]" onClick={reset} data-testid="progress-reset-yes">Sim, apagar</button>
            <button className="btn-soft" onClick={() => setAsk(false)} data-testid="progress-reset-cancel">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
