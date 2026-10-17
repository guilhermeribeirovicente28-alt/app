import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "idp_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && getToken() && !url.includes("/auth/")) {
      setToken(null);
      window.location.assign("/entrar");
    }
    return Promise.reject(error);
  }
);

export function formatDetail(detail) {
  if (detail == null) return "Algo deu errado. Tente de novo.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const errMsg = (e) => formatDetail(e?.response?.data?.detail ?? (e?.response ? undefined : e?.message));

export async function streamPost(path, body, onText, signal) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let d;
    try {
      d = (await res.json()).detail;
    } catch {
      d = undefined;
    }
    throw new Error(formatDetail(d));
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (!line.startsWith("data:")) continue;
      const ev = JSON.parse(line.slice(5));
      if (ev.error) throw new Error(ev.error);
      if (ev.t) {
        full += ev.t;
        onText(full);
      }
    }
  }
  return full;
}
