import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getToken() ? null : false);

  useEffect(() => {
    if (!getToken()) return;
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      setToken(null);
      setUser(false);
    });
  }, []);

  const signIn = useCallback(async (path, body) => {
    const { data } = await api.post(path, body);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(false);
  }, []);

  return <AuthContext.Provider value={{ user, setUser, signIn, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
