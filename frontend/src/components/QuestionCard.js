import { Check, X } from "lucide-react";
import { LETTERS, qHead } from "@/lib/constants";

function optClass(i, q, picked, reveal) {
  const base = "group w-full text-left flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm sm:text-[15px] transition-colors duration-200";
  if (reveal && picked !== null) {
    if (i === q.ans) return `${base} border-[#8fe0a0] bg-[#8fe0a0]/10 text-[#eef5f0]`;
    if (i === picked) return `${base} border-[#ff8a70] bg-[#ff8a70]/10 text-[#eef5f0]`;
    return `${base} border-[#373b3b] bg-[#262a2b]/60 text-[#a5bab8]`;
  }
  if (picked === i) return `${base} border-[#c6ef5e] bg-[#c6ef5e]/10 text-[#eef5f0] glow-lime`;
  return `${base} border-[#373b3b] bg-[#262a2b] text-[#eef5f0] hover:border-[#a5bab8]/60`;
}

const Mark = ({ i, q, picked, reveal }) => {
  if (reveal && picked !== null && i === q.ans) return <Check className="h-4 w-4 text-[#8fe0a0]" />;
  if (reveal && picked === i) return <X className="h-4 w-4 text-[#ff8a70]" />;
  return <span className="font-mono-num text-xs font-bold">{LETTERS[i]}</span>;
};

export const QuestionCard = ({ q, picked, onPick, reveal = true, children }) => (
  <div className="panel p-5 sm:p-7 rise" data-testid="question-card">
    <span className="eyebrow" data-testid="question-meta">{qHead(q)}</span>
    <p className="mt-3 text-lg sm:text-xl font-semibold leading-snug text-[#eef5f0]" data-testid="question-prompt">{q.prompt}</p>
    <div className="mt-5 flex flex-col gap-2.5">
      {q.opts.map((o, i) => (
        <button
          key={i}
          type="button"
          data-testid={`question-option-button-${LETTERS[i].toLowerCase()}`}
          disabled={reveal && picked !== null}
          onClick={() => onPick(i)}
          className={optClass(i, q, picked, reveal)}
        >
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0f151b] border border-[#373b3b]">
            <Mark i={i} q={q} picked={picked} reveal={reveal} />
          </span>
          <span className="leading-relaxed">{o}</span>
        </button>
      ))}
    </div>
    {children}
  </div>
);
