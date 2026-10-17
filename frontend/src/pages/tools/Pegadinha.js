import { useState } from "react";
import { Search } from "lucide-react";

const TRAPS = [
  ["não", "Comando negativo: a resposta é a que NÃO se encaixa."], ["nao", "Comando negativo."],
  ["exceto", "Pede a única alternativa fora do grupo."], ["incorreta", "Pede a errada, não a certa."], ["incorreto", "Pede a errada, não a certa."],
  ["falsa", "Pede a falsa, não a verdadeira."], ["falso", "Pede a falsa, não a verdadeira."], ["menos", "Pode inverter o que se pede."],
  ["somente", "Palavra restritiva: basta um contraexemplo para eliminar."], ["apenas", "Palavra restritiva: basta um contraexemplo para eliminar."],
  ["sempre", "Generalização absoluta, quase sempre pegadinha."], ["nunca", "Generalização absoluta, quase sempre pegadinha."],
  ["todos", "Generalização: confira se não há exceção."], ["nenhum", "Generalização: confira se não há exceção."],
];
const RE = new RegExp(`(${TRAPS.map((t) => t[0]).join("|")})`, "gi");
const find = (p) => TRAPS.find((x) => x[0] === p.toLowerCase());

export default function Pegadinha() {
  const [t, setT] = useState("Assinale a alternativa INCORRETA sobre a fotossíntese. Todos os seres vivos realizam fotossíntese, exceto os animais.");
  const [out, setOut] = useState(null);
  const run = () => {
    const parts = t.split(RE);
    const found = [];
    parts.forEach((p) => {
      const k = find(p);
      if (k && !found.find((f) => f[0] === k[0])) found.push(k);
    });
    setOut({ parts, found });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-5 flex flex-col gap-3">
        <label htmlFor="peg-txt" className="text-xs font-semibold text-[#a5bab8]">Cole o enunciado ou as alternativas</label>
        <textarea id="peg-txt" rows={4} className="field" value={t} onChange={(e) => { setT(e.target.value); setOut(null); }} data-testid="pegadinha-input" />
        <button className="btn-lime self-start" onClick={run} data-testid="pegadinha-submit-button"><Search className="h-4 w-4" />Caçar pegadinhas</button>
      </div>
      {out && (
        <div className="panel p-5 sm:p-6 flex flex-col gap-3 rise" data-testid="pegadinha-result">
          <p className="leading-relaxed text-[#eef5f0]">
            {out.parts.map((p, i) => (find(p) ? <mark key={i} className="rounded px-1 font-bold bg-[#f0c166]/30 text-[#f0c166]">{p}</mark> : <span key={i}>{p}</span>))}
          </p>
          {out.found.length === 0 ? <p className="text-sm text-[#a5bab8]">Nenhuma palavra de alerta encontrada. Leia com calma mesmo assim.</p> :
            out.found.map((f) => <p key={f[0]} className="text-sm text-[#a5bab8]"><b className="text-[#f0c166]">{f[0]}:</b> {f[1]}</p>)}
        </div>
      )}
    </div>
  );
}
