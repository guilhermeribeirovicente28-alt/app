import { useState } from "react";
import { FileUp, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";
import { streamPost } from "@/lib/api";

const MODES = [["resumo", "Resumo"], ["revisao", "Flashcards"], ["mapa", "Mapa mental"], ["desafio", "Desafio (5 questões)"]];

export default function Material() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("resumo");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300000) {
      toast.error("Arquivo grande demais. Use até 300 KB de texto.");
      return;
    }
    setText((await file.text()).slice(0, 30000));
    toast.success(`"${file.name}" carregado`);
  };

  const run = async () => {
    setBusy(true);
    setOut("");
    try {
      await streamPost("/ai/material", { text, mode }, setOut);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#a5bab8]">Cole o texto do seu material (apostila, anotações, capítulo)</span>
          <label className="btn-soft cursor-pointer text-xs" data-testid="material-file-label">
            <FileUp className="h-4 w-4" />Enviar .txt / .md
            <input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={onFile} data-testid="material-file-input" />
          </label>
        </div>
        <textarea rows={8} maxLength={30000} className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mínimo de 20 caracteres…" data-testid="material-text-input" />
        <div className="flex flex-wrap gap-2">
          {MODES.map(([k, l]) => <button key={k} className="chip" aria-pressed={mode === k} onClick={() => setMode(k)} data-testid={`material-mode-${k}`}>{l}</button>)}
        </div>
        <button className="btn-lime self-start" onClick={run} disabled={busy || text.trim().length < 20} data-testid="material-submit-button"><Wand2 className="h-4 w-4" />{busy ? "Processando…" : "Transformar"}</button>
      </div>
      {out && <div className="panel p-5 sm:p-7 rise"><Markdown text={out} streaming={busy} testid="material-output" /></div>}
    </div>
  );
}
