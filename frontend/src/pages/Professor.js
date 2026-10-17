import { useEffect, useRef, useState } from "react";
import { MessageCirclePlus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";
import { api, errMsg, streamPost } from "@/lib/api";

const SUGGESTIONS = [
  "Como resolvo uma equação do 2º grau?",
  "Me explica fotossíntese como se eu tivesse 10 anos",
  "Qual a diferença entre crase obrigatória e proibida?",
  "Me dá um macete para lembrar as leis de Newton",
];

function Sessions({ sessions, active, onPick, onNew, onDelete }) {
  return (
    <aside className="lg:w-60 shrink-0 flex lg:flex-col gap-2 overflow-x-auto no-scrollbar" data-testid="chat-sessions">
      <button className="btn-lime shrink-0" onClick={onNew} data-testid="chat-new-button"><MessageCirclePlus className="h-4 w-4" />Nova conversa</button>
      {sessions.map((s) => (
        <div key={s.id} className={`group shrink-0 flex items-center gap-1 rounded-xl border px-3 py-2 text-sm transition-colors max-w-[220px] lg:max-w-none ${active === s.id ? "border-[#c6ef5e]/50 bg-[#c6ef5e]/10 text-[#eef5f0]" : "border-[#373b3b] text-[#a5bab8] hover:text-[#eef5f0]"}`}>
          <button className="truncate flex-1 text-left" onClick={() => onPick(s.id)} data-testid={`chat-session-${s.id}`}>{s.title}</button>
          <button onClick={() => onDelete(s.id)} aria-label="Apagar conversa" className="opacity-60 hover:opacity-100 hover:text-[#ff8a70]" data-testid={`chat-session-delete-${s.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </aside>
  );
}

function Bubble({ m, streaming }) {
  if (m.role === "user") {
    return <div className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#c6ef5e] px-4 py-3 text-sm font-medium text-[#0f151b] whitespace-pre-wrap rise" data-testid="chat-msg-user">{m.content}</div>;
  }
  return (
    <div className="self-start max-w-[95%] rounded-2xl rounded-bl-md border border-[#373b3b] bg-[#1b1e20] px-4 py-3 rise" data-testid="chat-msg-assistant">
      {m.content ? <Markdown text={m.content} streaming={streaming} /> : <span className="text-sm text-[#a5bab8] animate-pulse">Pensando…</span>}
    </div>
  );
}

export default function Professor() {
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/chat/sessions").then((r) => setSessions(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  const pick = async (id) => {
    setActive(id);
    const { data } = await api.get(`/chat/sessions/${id}/messages`);
    setMsgs(data);
  };
  const newChat = () => {
    setActive(null);
    setMsgs([]);
  };
  const remove = async (id) => {
    await api.delete(`/chat/sessions/${id}`);
    setSessions((s) => s.filter((x) => x.id !== id));
    if (active === id) newChat();
  };

  const send = async (text) => {
    const t = (text ?? txt).trim();
    if (!t || busy) return;
    setBusy(true);
    setTxt("");
    let sid = active;
    try {
      if (!sid) {
        const { data } = await api.post("/chat/sessions");
        sid = data.id;
        setActive(sid);
        setSessions((s) => [{ ...data, title: t.slice(0, 60) }, ...s]);
      }
      setMsgs((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "" }]);
      await streamPost(`/chat/sessions/${sid}/messages`, { text: t }, (full) =>
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: full }]));
    } catch (e) {
      toast.error(e.message || errMsg(e));
      setMsgs((m) => (m.length && !m[m.length - 1].content ? m.slice(0, -1) : m));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" data-testid="professor-page">
      <div>
        <span className="eyebrow">Tutor IA</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#eef5f0]">Professor</h1>
        <p className="mt-1 text-sm text-[#a5bab8]">Tire dúvidas de qualquer matéria. Ele explica passo a passo e avisa quando não tem certeza.</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-5">
        <Sessions sessions={sessions} active={active} onPick={pick} onNew={newChat} onDelete={remove} />
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="panel p-4 sm:p-5 min-h-[50vh] max-h-[62vh] overflow-y-auto flex flex-col gap-3" data-testid="chat-messages">
            {msgs.length === 0 && (
              <div className="m-auto text-center max-w-md">
                <p className="text-[#eef5f0] font-bold">Sobre o que vamos estudar hoje?</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={s} className="chip" onClick={() => send(s)} data-testid={`chat-suggestion-${i}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => <Bubble key={i} m={m} streaming={busy && i === msgs.length - 1} />)}
            <div ref={endRef} />
          </div>
          <div className="flex items-end gap-2">
            <textarea rows={2} maxLength={4000} className="field resize-none" placeholder="Escreva sua dúvida… (Enter envia, Shift+Enter quebra linha)" value={txt}
              onChange={(e) => setTxt(e.target.value)} data-testid="ai-tutor-input-field"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="btn-lime h-[52px]" onClick={() => send()} disabled={busy || !txt.trim()} aria-label="Enviar" data-testid="ai-tutor-send-button"><Send className="h-4 w-4" /></button>
          </div>
          <p className="text-[11px] text-[#a5bab8]">Feito com IA. Pode errar: confira com seu professor ou livro.</p>
        </div>
      </div>
    </div>
  );
}
