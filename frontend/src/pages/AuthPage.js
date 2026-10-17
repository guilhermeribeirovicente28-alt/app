import { useState } from "react";
import { ArrowRight, Brain, CalendarDays, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { GRADES } from "@/lib/constants";

const HERO = "https://images.pexels.com/photos/8199555/pexels-photo-8199555.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1200";

const FEATURES = [
  { icon: Brain, t: "Descubra por que você erra", d: "Cada erro vira diagnóstico: interpretação, distração, conceito ou cálculo." },
  { icon: Sparkles, t: "Professor IA 24h", d: "Tire dúvidas de qualquer matéria, com explicação passo a passo." },
  { icon: CalendarDays, t: "Plano até a prova", d: "Um cronograma diário montado para a sua data e o seu tempo." },
];

function Hero() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-[#373b3b] p-12">
      <img src={HERO} alt="Estudante focada" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f151b] via-[#0f151b]/85 to-[#0f151b]/40" />
      <div className="relative">
        <span className="eyebrow">Plataforma de estudos</span>
        <h1 className="mt-4 text-4xl xl:text-6xl font-extrabold tracking-tight text-[#eef5f0] leading-[1.05]">
          Transforme erro<br />em <span className="text-[#c6ef5e]">acerto.</span>
        </h1>
        <p className="mt-5 max-w-md text-[#a5bab8]">Do 1º ano do fundamental ao ENEM, vestibular e concursos. Treino adaptativo, simulados e IA que ensina de verdade.</p>
      </div>
      <div className="relative grid gap-4 max-w-md">
        {FEATURES.map((f, i) => (
          <div key={f.t} className="flex gap-4 rise" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="h-10 w-10 shrink-0 rounded-xl bg-[#c6ef5e]/10 border border-[#c6ef5e]/30 flex items-center justify-center">
              <f.icon className="h-5 w-5 text-[#c6ef5e]" />
            </div>
            <div>
              <div className="font-bold text-[#eef5f0]">{f.t}</div>
              <div className="text-sm text-[#a5bab8]">{f.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "", grade: "ENEM" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = mode === "login"
        ? await signIn("/auth/login", { email: f.email, password: f.password })
        : await signIn("/auth/register", f);
      toast.success(`Bem-vindo(a), ${u.name.split(" ")[0]}!`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grain min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[#0f151b]">
      <Hero />
      <div className="relative z-10 flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm rise" data-testid="auth-form">
          <span className="eyebrow">Inimigo das Provas</span>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#eef5f0]">{mode === "login" ? "Entrar" : "Criar sua conta"}</h2>
          <p className="mt-2 text-sm text-[#a5bab8]">{mode === "login" ? "Continue de onde parou." : "Grátis. Leva 20 segundos."}</p>
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-[#373b3b] bg-[#1b1e20] p-1">
            {[["login", "Entrar"], ["register", "Criar conta"]].map(([k, l]) => (
              <button key={k} type="button" data-testid={`auth-tab-${k}`} onClick={() => { setMode(k); setError(""); }}
                className={`rounded-lg py-2 text-sm font-bold transition-colors ${mode === k ? "bg-[#c6ef5e] text-[#0f151b]" : "text-[#a5bab8] hover:text-[#eef5f0]"}`}>{l}</button>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-4">
            {mode === "register" && (
              <>
                <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Nome
                  <input className="field" required value={f.name} onChange={set("name")} placeholder="Como quer ser chamado(a)?" data-testid="auth-name-input" />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Ano / objetivo
                  <select className="field" value={f.grade} onChange={set("grade")} data-testid="auth-grade-select">
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
              </>
            )}
            <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">E-mail
              <input className="field" type="email" required value={f.email} onChange={set("email")} placeholder="voce@email.com" data-testid="auth-email-input" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#a5bab8]">Senha
              <input className="field" type="password" required minLength={6} value={f.password} onChange={set("password")} placeholder="Mínimo 6 caracteres" data-testid="auth-password-input" />
            </label>
            {error && <p className="text-sm text-[#ff8a70]" role="alert" data-testid="auth-error">{error}</p>}
            <button className="btn-lime w-full mt-2" disabled={busy} data-testid="auth-submit-button">
              {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}<ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
