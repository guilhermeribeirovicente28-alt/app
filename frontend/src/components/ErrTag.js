import { TYPES } from "@/lib/constants";

export const ErrTag = ({ t, small }) => {
  const e = TYPES[t];
  if (!e) return null;
  return (
    <span
      data-testid={`error-tag-${e.slug}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold ${small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`}
      style={{ color: e.c, background: `${e.c}1a`, borderColor: `${e.c}55` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: e.c }} />
      Erro de {e.label.toLowerCase()}
    </span>
  );
};
