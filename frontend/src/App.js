import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Train from "@/pages/Train";
import Simulado from "@/pages/Simulado";
import Professor from "@/pages/Professor";
import Tools from "@/pages/Tools";
import ToolPage from "@/pages/ToolPage";
import Plano from "@/pages/Plano";
import Progresso from "@/pages/Progresso";

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f151b]" data-testid="app-loading">
    <div className="h-10 w-10 rounded-full border-2 border-[#373b3b] border-t-[#c6ef5e] animate-spin" />
  </div>
);

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  if (!user) return <Navigate to="/entrar" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === null) return <Loading />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  useEffect(() => {
    document.title = "Inimigo das Provas";
  }, []);
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/entrar" element={<PublicOnly><AuthPage /></PublicOnly>} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="treino" element={<Train />} />
              <Route path="simulado" element={<Simulado />} />
              <Route path="professor" element={<Professor />} />
              <Route path="ferramentas" element={<Tools />} />
              <Route path="ferramentas/:tool" element={<ToolPage />} />
              <Route path="plano" element={<Plano />} />
              <Route path="progresso" element={<Progresso />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster theme="dark" position="top-center" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
