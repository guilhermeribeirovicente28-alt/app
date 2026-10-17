import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Factory, FileText, PenLine, ScanSearch, Search, Sparkles } from "lucide-react";

export const TOOLS = [
  { id: "aprender", n: "Aprender", d: "Explicação no seu nível, com exemplo resolvido e mini exercício.", icon: BookOpen, ai: true },
  { id: "gerar", n: "Gerar questões com IA", d: "Questões inéditas por matéria, assunto, série e dificuldade.", icon: Sparkles, ai: true },
  { id: "upload", n: "Upload de material", d: "Envie PDF, foto da apostila ou texto e receba resumo, flashcards, mapa mental ou desafio.", icon: FileText, ai: true },
  { id: "fabricante", n: "Fabricante de Provas", d: "Monte uma prova por assunto e dificuldade e faça como simulado.", icon: Factory, ai: true },
  { id: "raiox", n: "Raio-X", d: "Descubra por que cada alternativa tentou te derrubar.", icon: ScanSearch },
  { id: "pegadinha", n: "Caça à Pegadinha", d: "Encontre comandos negativos, generalizações e palavras traiçoeiras.", icon: Search },
  { id: "criar", n: "Criar questão", d: "Escreva sua própria questão, com gabarito e tipo de erro.", icon: PenLine },
];

export default function Tools() {
  return (
    <div className="flex flex-col gap-6" data-testid="tools-page">
      <div>
        <span className="eyebrow">Arsenal</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#eef5f0]">Ferramentas</h1>
        <p className="mt-1 text-sm text-[#a5bab8]">As marcadas com IA podem errar: confira com seu professor ou livro.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t, i) => (
          <Link key={t.id} to={`/ferramentas/${t.id}`} data-testid={`tool-card-${t.id}`} style={{ animationDelay: `${i * 50}ms` }}
            className={`rise group panel p-5 transition-colors duration-200 hover:border-[#c6ef5e]/40 ${i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-[#262a2b] border border-[#373b3b] flex items-center justify-center group-hover:border-[#c6ef5e]/40 transition-colors">
                <t.icon className="h-5 w-5 text-[#c6ef5e]" />
              </div>
              <div className="flex items-center gap-2">
                {t.ai && <span className="rounded-full border border-[#c3a2ff]/40 bg-[#c3a2ff]/10 px-2 py-0.5 text-[10px] font-bold text-[#c3a2ff]">IA</span>}
                <ArrowUpRight className="h-4 w-4 text-[#a5bab8] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </div>
            <div className="mt-4 font-bold text-[#eef5f0]">{t.n}</div>
            <p className="mt-1 text-sm text-[#a5bab8]">{t.d}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
