import { useState } from "react";
import { Camera, FileUp, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";
import { api, errMsg, streamPost } from "@/lib/api";

const MODES = [["resumo", "Resumo"], ["revisao", "Flashcards"], ["mapa", "Mapa mental"], ["desafio", "Desafio (5 questões)"]];

export default function Material() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("resumo");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo maior que 10 MB.");
      return;
    }
    setReading(file.type.startsWith("image/") ? "Lendo a foto com IA… (até 30s)" : "Extraindo o texto…");
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.post("/ai/extract", body);
      setText(data.text);
      toast.success(`"${file.name}" carregado${data.truncated ? " (só o início, arquivo muito longo)" : ""}. Revise o texto e escolha o formato.`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setReading("");
    }
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
          <span className="text-xs font-semibold text-[#a5bab8]">Envie a apostila em PDF, uma foto da página ou cole o texto</span>
          <div className="flex flex-wrap gap-2">
            <label className={`btn-soft cursor-pointer text-xs ${reading ? "pointer-events-none opacity-50" : ""}`} data-testid="material-file-label">
              <FileUp className="h-4 w-4" />PDF ou .txt
              <input type="file" accept=".pdf,application/pdf,.txt,.md,text/plain" className="hidden" onChange={onFile} data-testid="material-file-input" />
            </label>
            <label className={`btn-soft cursor-pointer text-xs ${reading ? "pointer-events-none opacity-50" : ""}`} data-testid="material-photo-label">
              <Camera className="h-4 w-4" />Foto
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={onFile} data-testid="material-photo-input" />
            </label>
          </div>
        </div>
        {reading && <p className="text-sm text-[#c6ef5e] animate-pulse" data-testid="material-reading">{reading}</p>}
        <textarea rows={8} maxLength={30000} className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mínimo de 20 caracteres…" data-testid="material-text-input" />
        <div className="flex flex-wrap gap-2">
          {MODES.map(([k, l]) => <button key={k} className="chip" aria-pressed={mode === k} onClick={() => setMode(k)} data-testid={`material-mode-${k}`}>{l}</button>)}
        </div>
        <button className="btn-lime self-start" onClick={run} disabled={busy || !!reading || text.trim().length < 20} data-testid="material-submit-button"><Wand2 className="h-4 w-4" />{busy ? "Processando…" : "Transformar"}</button>
      </div>
      {out && <div className="panel p-5 sm:p-7 rise"><Markdown text={out} streaming={busy} testid="material-output" /></div>}
    </div>
  );
}
