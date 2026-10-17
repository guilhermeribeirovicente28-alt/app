import { Flame, Target, Zap } from "lucide-react";

export const StatTiles = ({ s }) => {
  const items = [
    { k: "xp", label: "XP total", v: s ? s.xp : "—", icon: Zap, c: "#c6ef5e" },
    { k: "acc", label: "precisão", v: s ? (s.acc === null ? "0%" : `${s.acc}%`) : "—", icon: Target, c: "#8cc4ff" },
    { k: "streak", label: "dias seguidos", v: s ? s.streak : "—", icon: Flame, c: "#f0c166" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((it, idx) => (
        <div key={it.k} className="panel p-4 sm:p-5 rise" style={{ animationDelay: `${idx * 60}ms` }} data-testid={`stat-${it.k}`}>
          <it.icon className="h-4 w-4" style={{ color: it.c }} />
          <div className="mt-3 font-mono-num text-2xl sm:text-3xl font-bold text-[#eef5f0]">{it.v}</div>
          <div className="text-[11px] sm:text-xs text-[#a5bab8] mt-0.5">{it.label}</div>
        </div>
      ))}
    </div>
  );
};
