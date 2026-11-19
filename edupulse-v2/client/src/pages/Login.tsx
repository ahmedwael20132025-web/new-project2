import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Button, ErrorNote, Input } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const { t, err, toggle } = useI18n();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await login(username, password); } catch (x) { setError(err(x)); } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6">
        <div>
          <div className="font-display text-3xl font-bold tracking-wide">EDUPULSE</div>
          <div className="text-sm text-muted">{t("tagline")}</div>
        </div>
        {error && <ErrorNote text={error} />}
        <Input label={t("auth.username")} value={username} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" required dir="ltr" />
        <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required dir="ltr" />
        <Button type="submit" disabled={busy} className="w-full">{t("auth.login")}</Button>
        <button type="button" onClick={toggle} className="block w-full text-center text-sm text-muted hover:text-ink">{t("c.lang")}</button>
      </form>
    </div>
  );
}
