import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, STATUSES, type Counts } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Card, ErrorNote, PageHeader, Spinner, STATUS_VAR } from "../components/ui";

type Dash = {
  today: string; studentCount: number; classCount: number;
  todayCounts: Counts & { rate: number | null };
  pendingClasses: { id: number; name: string }[];
  week: (Counts & { date: string; rate: number | null })[];
};

export default function Dashboard() {
  const { t, lang, err } = useI18n();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dash>("/dashboard") });
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <ErrorNote text={err(q.error)} />;
  const d = q.data!;
  const total = d.todayCounts.present + d.todayCounts.absent + d.todayCounts.late + d.todayCounts.excused;
  const key = (s: (typeof STATUSES)[number]) => s.toLowerCase() as keyof Counts;
  const nf = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en");

  return (
    <>
      <PageHeader title={t("dash.title")} />

      <Card className="mb-5 p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted">{t("dash.rate")}</span>
          <span className="font-display text-2xl font-bold">{d.todayCounts.rate === null ? "—" : `${nf.format(d.todayCounts.rate)}%`}</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-bg" role="img" aria-label={t("dash.rate")}>
          {total > 0 && STATUSES.map((s) => d.todayCounts[key(s)] > 0 && (
            <div key={s} style={{ width: `${(d.todayCounts[key(s)] / total) * 100}%`, background: `var(--${STATUS_VAR[s]})` }} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {STATUSES.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(--${STATUS_VAR[s]})` }} />
              {t(`status.${s}`)} <b>{nf.format(d.todayCounts[key(s)])}</b>
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-6 border-t border-line pt-3 text-sm text-muted">
          <span>{t("dash.students")}: <b className="text-ink">{nf.format(d.studentCount)}</b></span>
          <span>{t("dash.classes")}: <b className="text-ink">{nf.format(d.classCount)}</b></span>
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">{t("dash.pending")}</h2>
          {d.pendingClasses.length === 0 ? (
            <p className="text-sm text-present">{t("dash.allDone")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.pendingClasses.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span>{c.name}</span>
                  <Link className="text-sm font-medium text-brand hover:underline" to={`/attendance?classId=${c.id}&date=${d.today}`}>{t("dash.record")}</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">{t("dash.week")}</h2>
          <div className="flex h-36 items-end gap-2">
            {d.week.map((w) => (
              <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] text-muted">{w.rate === null ? "" : nf.format(Math.round(w.rate))}</span>
                <div className="flex w-full flex-1 items-end rounded bg-bg">
                  <div className="w-full rounded" style={{ height: `${w.rate ?? 0}%`, background: "var(--brand)" }} />
                </div>
                <span className="text-[11px] text-muted">{new Date(`${w.date}T00:00:00`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en", { weekday: "short" })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
