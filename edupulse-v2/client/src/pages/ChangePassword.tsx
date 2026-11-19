import { useState, type FormEvent } from "react";
import { api, type User } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Button, ErrorNote, Input } from "../components/ui";

export default function ChangePassword() {
  const { setUser, logout } = useAuth();
  const { t, err } = useI18n();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (nw !== conf) return setError(t("auth.mismatch"));
    setBusy(true); setError("");
    try { setUser(await api<User>("/auth/change-password", { method: "POST", body: { currentPassword: cur, newPassword: nw } })); }
    catch (x) { setError(err(x)); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6">
        <h1 className="font-display text-xl font-bold">{t("auth.changeTitle")}</h1>
        <p className="text-sm text-muted">{t("auth.changeHint")}</p>
        {error && <ErrorNote text={error} />}
        <Input label={t("auth.current")} type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required dir="ltr" />
        <Input label={t("auth.new")} type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" minLength={8} required dir="ltr" />
        <Input label={t("auth.confirm")} type="password" value={conf} onChange={(e) => setConf(e.target.value)} autoComplete="new-password" minLength={8} required dir="ltr" />
        <Button type="submit" disabled={busy} className="w-full">{t("c.save")}</Button>
        <button type="button" onClick={logout} className="block w-full text-center text-sm text-muted hover:text-ink">{t("auth.logout")}</button>
      </form>
    </div>
  );
}
