import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { GRADES, LETTERS, TYPES } from "@/lib/constants";
import { useMeta } from "@/lib/useMeta";

const empty = (grade) => ({ subj: "", grade, topic: "", level: 2, prompt: "", opts: ["", "", "", ""], ans: 0, err: ["conc", "conc", "conc", "conc"], hint: "", why: "" });

function Mine({ list, onDelete }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-[#eef5f0]" data-testid="my-questions-title">Minhas questões ({list.length})</h2>
      {list.length === 0 ? <p className="text-sm text-[#a5bab8]">Você ainda não criou nem gerou nenhuma.</p> : list.map((q) => (
        <div key={q.id} className="panel p-4 flex items-start justify-between gap-3" data-testid={`my-question-${q.id}`}>
          <div className="min-w-0">
            <span className="eyebrow">{q.subj} · {q.topic} · {q.source === "ai" ? "IA" : "sua"}</span>
            <p className="mt-1 text-sm text-[#eef5f0]">{q.prompt}</p>
          </div>
          <button onClick={() => onDelete(q.id)} className="rounded-lg p-2 text-[#a5bab8] hover:text-[#ff8a70] hover:bg-[#262a2b]" aria-label="Remover" data-testid={`my-question-delete-${q.id}`}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

export default function CriarQuestao() {
  const { user } = useAuth();
  const meta = useMeta();
  const [f, setF] = useState(empty(user.grade));
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get("/questions", { params: { mine: true } }).then((r) => setMine(r.data));
  }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setArr = (k, i, v) => setF({ ...f, [k]: f[k].map((x, j) => (j === i ? v : x)) });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/questions", { ...f, level: Number(f.level) });
      setMine((m) => [data, ...m]);
      setF(empty(user.grade));
      toast.success("Questão salva. Ela já aparece no Treino e no Simulado.");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id) => {
    await api.delete(`/questions/${id}`);
    setMine((m) => m.filter((q) => q.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="panel p-5 sm:p-6 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <input className="field" required list="c-subj" value={f.subj} onChange={set("subj")} placeholder="Matéria" data-testid="create-subject-input" />
          <datalist id="c-subj">{meta.plan_subjects.map((s) => <option key={s} value={s} />)}</datalist>
          <input className="field" required value={f.topic} onChange={set("topic")} placeholder="Assunto" data-testid="create-topic-input" />
          <select className="field" value={f.grade} onChange={set("grade")} data-testid="create-grade-select">{GRADES.map((g) => <option key={g}>{g}</option>)}</select>
          <select className="field" value={f.level} onChange={set("level")} data-testid="create-level-select">{[1, 2, 3].map((n) => <option key={n} value={n}>Nível {n}</option>)}</select>
        </div>
        <textarea className="field" required rows={3} value={f.prompt} onChange={set("prompt")} placeholder="Enunciado" data-testid="create-prompt-input" />
        <p className="text-xs text-[#a5bab8]">Alternativas: marque a certa e, nas erradas, diga que tipo de erro ela provoca.</p>
        {f.opts.map((o, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[auto_1fr_200px] sm:items-center rounded-xl bg-[#262a2b] p-3">
            <label className="flex items-center gap-2 text-sm font-bold text-[#eef5f0]">
              <input type="radio" name="c-ans" checked={f.ans === i} onChange={() => setF({ ...f, ans: i })} className="accent-[#c6ef5e]" data-testid={`create-correct-radio-${i}`} />{LETTERS[i]})
            </label>
            <input className="field" required value={o} onChange={(e) => setArr("opts", i, e.target.value)} placeholder={`Alternativa ${LETTERS[i]}`} data-testid={`create-option-input-${i}`} />
            {f.ans === i ? <span className="text-xs font-bold text-[#8fe0a0]">Correta</span> : (
              <select className="field" value={f.err[i]} onChange={(e) => setArr("err", i, e.target.value)} data-testid={`create-error-select-${i}`}>
                {Object.keys(TYPES).map((k) => <option key={k} value={k}>Erro de {TYPES[k].label.toLowerCase()}</option>)}
              </select>
            )}
          </div>
        ))}
        <input className="field" value={f.hint} onChange={set("hint")} placeholder="Dica (opcional)" data-testid="create-hint-input" />
        <textarea className="field" rows={2} value={f.why} onChange={set("why")} placeholder="Explicação da resposta (opcional)" data-testid="create-why-input" />
        <button className="btn-lime self-start" disabled={busy} data-testid="create-submit-button"><Save className="h-4 w-4" />Salvar questão</button>
      </form>
      <Mine list={mine} onDelete={remove} />
    </div>
  );
}
