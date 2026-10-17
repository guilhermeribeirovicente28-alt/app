import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, BookOpenCheck, CalendarDays, Flame, GraduationCap, Home, LogOut, Menu, MessageCircle, Timer, Wrench, Zap } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { to: "/", key: "inicio", label: "Início", icon: Home },
  { to: "/treino", key: "treino", label: "Treino", icon: BookOpenCheck },
  { to: "/simulado", key: "simulado", label: "Simulado", icon: Timer },
  { to: "/professor", key: "professor", label: "Professor", icon: MessageCircle },
  { to: "/ferramentas", key: "ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/plano", key: "plano", label: "Plano de estudos", icon: CalendarDays },
  { to: "/progresso", key: "progresso", label: "Progresso", icon: BarChart3 },
];
const MOBILE_MAIN = ["inicio", "treino", "professor", "plano"];

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="h-9 w-9 rounded-xl bg-[#c6ef5e] flex items-center justify-center shadow-[0_0_24px_rgba(198,239,94,0.35)]">
      <GraduationCap className="h-5 w-5 text-[#0f151b]" />
    </div>
    <div className="leading-none">
      <div className="text-[13px] font-extrabold tracking-tight text-[#eef5f0]">INIMIGO</div>
      <div className="text-[10px] font-bold tracking-[0.2em] text-[#c6ef5e]">DAS PROVAS</div>
    </div>
  </div>
);

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
    isActive ? "bg-[#c6ef5e] text-[#0f151b]" : "text-[#a5bab8] hover:text-[#eef5f0] hover:bg-[#1b1e20]"
  }`;

const StatPills = ({ stats }) => (
  <div className="flex items-center gap-2">
    <span data-testid="user-xp-counter" className="inline-flex items-center gap-1 rounded-full border border-[#c6ef5e]/30 bg-[#c6ef5e]/10 px-2.5 py-1 text-xs font-bold text-[#c6ef5e] font-mono-num">
      <Zap className="h-3.5 w-3.5" />{stats ? stats.xp : 0} XP
    </span>
    <span data-testid="user-streak-badge" className="inline-flex items-center gap-1 rounded-full border border-[#f0c166]/30 bg-[#f0c166]/10 px-2.5 py-1 text-xs font-bold text-[#f0c166] font-mono-num">
      <Flame className="h-3.5 w-3.5" />{stats ? stats.streak : 0}
    </span>
  </div>
);

function Sidebar({ stats, user, onLogout }) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[260px] flex-col border-r border-[#373b3b] bg-[#0f151b] px-4 py-6">
      <Logo />
      <div className="mt-6 panel p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#a5bab8]">Nível</span>
          <span className="font-mono-num text-sm font-bold text-[#eef5f0]" data-testid="sidebar-level">{stats ? stats.level : 1}</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-[#262a2b] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#8fe0a0] to-[#c6ef5e] transition-[width] duration-500" style={{ width: `${stats ? stats.level_progress : 0}%` }} />
        </div>
        <div className="mt-3"><StatPills stats={stats} /></div>
      </div>
      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink key={n.key} to={n.to} end={n.to === "/"} className={linkCls} data-testid={`nav-tab-${n.key}`}>
            <n.icon className="h-4 w-4" />{n.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center justify-between gap-2 rounded-xl border border-[#373b3b] p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#eef5f0]" data-testid="sidebar-user-name">{user.name}</div>
          <div className="truncate text-xs text-[#a5bab8]">{user.grade}</div>
        </div>
        <button onClick={onLogout} className="rounded-lg p-2 text-[#a5bab8] hover:text-[#ff8a70] hover:bg-[#1b1e20] transition-colors" data-testid="logout-button" aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}

function MobileNav({ onLogout }) {
  const [open, setOpen] = useState(false);
  const mobileItem = ({ isActive }) =>
    `flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-semibold transition-colors ${isActive ? "text-[#c6ef5e]" : "text-[#a5bab8]"}`;
  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#373b3b] bg-[#0f151b]/90 backdrop-blur-xl flex justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV.filter((n) => MOBILE_MAIN.includes(n.key)).map((n) => (
          <NavLink key={n.key} to={n.to} end={n.to === "/"} className={mobileItem} data-testid={`mobile-nav-${n.key}`}>
            <n.icon className="h-5 w-5" />{n.key === "plano" ? "Plano" : n.label}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#a5bab8]" data-testid="mobile-nav-mais">
          <Menu className="h-5 w-5" />Mais
        </button>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="bg-[#1b1e20] border-[#373b3b] rounded-t-3xl">
          <SheetTitle className="text-[#eef5f0]">Mais</SheetTitle>
          <div className="mt-4 grid gap-1">
            {NAV.filter((n) => !MOBILE_MAIN.includes(n.key)).map((n) => (
              <NavLink key={n.key} to={n.to} className={linkCls} onClick={() => setOpen(false)} data-testid={`mobile-more-${n.key}`}>
                <n.icon className="h-4 w-4" />{n.label}
              </NavLink>
            ))}
            <button onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#ff8a70] hover:bg-[#262a2b]" data-testid="mobile-logout-button">
              <LogOut className="h-4 w-4" />Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const reloadStats = useCallback(() => {
    api.get("/progress").then((r) => setStats(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    reloadStats();
  }, [location.pathname, reloadStats]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const onLogout = () => {
    logout();
    navigate("/entrar");
  };
  return (
    <div className="grain min-h-screen bg-[#0f151b]">
      <Sidebar stats={stats} user={user} onLogout={onLogout} />
      <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#373b3b] bg-[#0f151b]/85 backdrop-blur-md px-4">
        <Logo />
        <StatPills stats={stats} />
      </header>
      <main className="relative z-10 lg:pl-[260px]">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-6 sm:py-10 pb-28 lg:pb-12">
          <Outlet context={{ stats, reloadStats }} />
        </div>
      </main>
      <MobileNav onLogout={onLogout} />
    </div>
  );
}
