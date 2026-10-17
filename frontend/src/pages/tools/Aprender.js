import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Markdown } from "@/components/Markdown";
import { streamPost } from "@/lib/api";
import { GRADES } from "@/lib/constants";

export default function Aprender() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get("topic") || "");
  const [grade, setGrade] = useState(user.grade);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (e) => {
    e.preventDefault();
    setBusy(true);
    setOut("");
    try {
      await streamPost("/ai/learn", { topic, grade }, setOut);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={run} className="panel p-5 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">O que você quer aprender?
          <input className="field" required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Regra de três, Revolução Francesa, verbo to be" data-testid="learn-topic-input" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Nível
          <select className="field" value={grade} onChange={(e) => setGrade(e.target.value)} data-testid="learn-grade-select">
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <button className="btn-lime" disabled={busy || !topic.trim()} data-testid="learn-submit-button"><BookOpen className="h-4 w-4" />{busy ? "Explicando…" : "Explicar"}</button>
      </form>
      {out && <div className="panel p-5 sm:p-7 rise"><Markdown text={out} streaming={busy} testid="learn-output" /></div>}
    </div>
  );
}
