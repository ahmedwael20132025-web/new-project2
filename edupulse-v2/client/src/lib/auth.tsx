import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type User } from "./api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
};
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try { return await api<User>("/auth/me"); }
      catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e; }
    },
  });
  const setUser = (u: User | null) => qc.setQueryData(["me"], u);
  return (
    <Ctx.Provider
      value={{
        user: data ?? null,
        loading: isLoading,
        setUser: (u) => setUser(u),
        login: async (username, password) => {
          const u = await api<User>("/auth/login", { method: "POST", body: { username, password } });
          qc.clear(); setUser(u);
        },
        logout: async () => { await api("/auth/logout", { method: "POST" }); qc.clear(); setUser(null); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
