export const TYPES = {
  interp: { label: "Interpretação", slug: "interpretacao", c: "#8cc4ff" },
  distr: { label: "Distração", slug: "distracao", c: "#f0c166" },
  conc: { label: "Conceito", slug: "conceito", c: "#c3a2ff" },
  calc: { label: "Cálculo", slug: "calculo", c: "#ff8a70" },
};

export const LETTERS = ["A", "B", "C", "D"];

export const GRADES = ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano", "6º ano", "7º ano", "8º ano", "9º ano",
  "1º EM", "2º EM", "3º EM", "ENEM", "Vestibular", "Concurso", "Faculdade"];

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const qHead = (q) =>
  `${q.subj} · ${q.grade} · ${q.topic} · nível ${q.level}${q.source === "ai" ? " · gerada por IA" : q.source === "custom" ? " · sua" : ""}`;
