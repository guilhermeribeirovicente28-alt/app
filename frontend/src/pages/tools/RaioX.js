import { useEffect, useState } from "react";
import { ErrTag } from "@/components/ErrTag";
import { api } from "@/lib/api";
import { LETTERS, qHead } from "@/lib/constants";

export default function RaioX() {
  const [qs, setQs] = useState([]);
  const [id, setId] = useState("");
  useEffect(() => {
    api.get("/questions").then((r) => {
      setQs(r.data);
      setId(r.data[0]?.id || "");
    });
  }, []);
  const q = qs.find((x) => x.id === id);
  return (
    <div className="flex flex-col gap-4">
      <select className="field" value={id} onChange={(e) => setId(e.target.value)} data-testid="raiox-question-select">
        {qs.map((b) => <option key={b.id} value={b.id}>{b.subj} · {b.topic} · {b.prompt.slice(0, 50)}{b.prompt.length > 50 ? "…" : ""}</option>)}
      </select>
      {q && (
        <div className="panel p-5 sm:p-7 flex flex-col gap-3 rise" key={q.id} data-testid="raiox-card">
          <span className="eyebrow">{qHead(q)}</span>
          <p className="text-lg font-semibold text-[#eef5f0]">{q.prompt}</p>
          {q.opts.map((o, i) => (
            <div key={i} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 bg-[#262a2b] px-4 py-3 ${i === q.ans ? "border-l-[#8fe0a0]" : "border-l-[#ff8a70]"}`}>
              <span className="text-sm text-[#eef5f0]"><b className="font-mono-num">{LETTERS[i]})</b> {o}</span>
              {i === q.ans ? <span className="rounded-full border border-[#8fe0a0]/50 px-3 py-1 text-xs font-bold text-[#8fe0a0]">Certa</span> : <ErrTag t={q.err[i]} small />}
            </div>
          ))}
          <p className="text-sm text-[#a5bab8]">{q.why}</p>
        </div>
      )}
    </div>
  );
}
