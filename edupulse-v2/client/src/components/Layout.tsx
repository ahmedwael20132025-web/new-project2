import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { Icon, ICONS } from "./ui";

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, toggle: toggleLang } = useI18n();
  const { dark, toggle: toggleTheme } = useTheme();
  const admin = user?.role === "ADMIN";

  const items = [
    { to: "/", label: t("nav.dashboard"), icon: ICONS.home, end: true },
    { to: "/attendance", label: t("nav.attendance"), icon: ICONS.check },
    { to: "/students", label: t("nav.students"), icon: ICONS.users },
    ...(admin ? [{ to: "/classes", label: t("nav.classes"), icon: ICONS.book }, { to: "/teachers", label: t("nav.teachers"), icon: ICONS.teacher }] : []),
    { to: "/reports", label: t("nav.reports"), icon: ICONS.chart },
  ];
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? "bg-brand text-on-brand" : "text-muted hover:bg-bg hover:text-ink"}`;

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print hidden w-60 shrink-0 flex-col border-e border-line bg-surface p-4 lg:flex">
        <div className="mb-6 px-2">
          <div className="font-display text-xl font-bold tracking-wide">EDUPULSE</div>
          <div className="text-xs text-muted">{t("tagline")}</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((i) => <NavLink key={i.to} to={i.to} end={i.end} className={link}><Icon d={i.icon} />{i.label}</NavLink>)}
        </nav>
        <div className="border-t border-line pt-3 text-sm">
          <div className="mb-2 truncate px-2 font-medium">{user?.name}</div>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted hover:bg-bg hover:text-ink"><Icon d={ICONS.logout} />{t("auth.logout")}</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center justify-between border-b border-line bg-surface px-4 py-2 lg:justify-end">
          <div className="font-display text-lg font-bold lg:hidden">EDUPULSE</div>
          <div className="flex items-center gap-1">
            <button onClick={toggleLang} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg">{t("c.lang")}</button>
            <button onClick={toggleTheme} aria-label={t("c.theme")} className="rounded-lg p-2 text-muted hover:bg-bg"><Icon d={dark ? ICONS.sun : ICONS.moon} /></button>
            <button onClick={logout} aria-label={t("auth.logout")} className="rounded-lg p-2 text-muted hover:bg-bg lg:hidden"><Icon d={ICONS.logout} /></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 lg:p-8"><Outlet /></main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-surface px-1 py-1 lg:hidden">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] ${isActive ? "text-brand" : "text-muted"}`}>
            <Icon d={i.icon} className="h-5 w-5" /><span className="truncate">{i.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
