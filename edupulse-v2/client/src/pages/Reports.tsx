import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, api, STATUSES, todayLocal, type ClassRow, type Counts, type Status } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Button, Card, Empty, ErrorNote, Input, Modal, PageHeader, Select, Spinner, StatusBadge, STATUS_VAR } from "../components/ui";

type Row = Counts & { id: number; name: string; code: string; className: string; rate: number | null };
type Summary = {
  totals: Counts & { rate: number | null };
  students: Row[];
  daily: (Counts & { date: string; rate: number | null })[];
};
type StudentReport = {
  student: { name: string; code: string; className: string };
  totals: Counts & { rate: number | null };
  records: { date: string; status: Status; note: string | null }[];
};

export default function Reports() {
  const { t, lang, err } = useI18n();
  const nf = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en");
  const [from, setFrom] = useState(addDays(todayLocal(), -29));
  const [to, setTo] = useState(todayLocal());
  const [classId, setClassId] = useState("");
  const [sel, setSel] = useState<Row | null>(null);

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api<ClassRow[]>("/classes") });
  const q = useQuery({
    queryKey: ["report", from, to, classId],
    enabled: from <= to,
    queryFn: () => api<Summary>(`/reports/summary?${new URLSearchParams({ from, to, ...(classId && { classId }) })}`),
  });
  const detail = useQuery({
    queryKey: ["report", "student", sel?.id, from, to],
    enabled: !!sel,
    queryFn: () => api<StudentReport>(`/reports/student/${sel!.id}?${new URLSearchParams({ from, to })}`),
  });

  const exportCsv = () => {
    if (!q.data) return;
    const head = [t("c.name"), t("c.code"), t("c.class"), ...STATUSES.map((s) => t(`status.${s}`)), `${t("rep.rate")} %`];
    const lines = q.data.students.map((s) => [s.name, s.code, s.className, s.present, s.absent, s.late, s.excused, s.rate ?? ""]);
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [head, ...lines].map((r) => r.map(esc).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `attendance_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const d = q.data;
  const total = d ? d.totals.present + d.totals.absent + d.totals.late + d.totals.excused : 0;

  return (
    <>
      <PageHeader title={t("rep.title")}>
        <Button variant="ghost" onClick={exportCsv} disabled={!d?.students.length}>{t("rep.export")}</Button>
        <Button variant="ghost" onClick={() => window.print()}>{t("rep.print")}</Button>
      </PageHeader>

      <div className="no-print mb-5 grid gap-3 sm:grid-cols-3">
        <Input label={t("c.from")} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} dir="ltr" />
        <Input label={t("c.to")} type="date" value={to} min={from} max={todayLocal()} onChange={(e) => setTo(e.target.value)} dir="ltr" />
        <Select label={t("c.class")} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t("c.allClasses")}</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {q.isLoading && <Spinner />}
      {q.isError && <ErrorNote text={err(q.error)} />}
      {d && total === 0 && <Card><Empty text={t("rep.empty")} /></Card>}

      {d && total > 0 && (
        <>
          <Card className="mb-5 p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-muted">{t("rep.rate")}</span>
              <span className="font-display text-2xl font-bold">{d.totals.rate === null ? "—" : `${nf.format(d.totals.rate)}%`}</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-bg">
              {STATUSES.map((s) => { const n = d.totals[s.toLowerCase() as keyof Counts]; return n > 0 && <div key={s} style={{ width: `${(n / total) * 100}%`, background: `var(--${STATUS_VAR[s]})` }} />; })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {STATUSES.map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(--${STATUS_VAR[s]})` }} />
                  {t(`status.${s}`)} <b>{nf.format(d.totals[s.toLowerCase() as keyof Counts])}</b>
                </span>
              ))}
            </div>
          </Card>

          <Card className="mb-5 p-5">
            <h2 className="mb-3 font-display text-lg font-bold">{t("rep.daily")}</h2>
            <div className="flex h-28 items-end gap-1 overflow-x-auto" dir="ltr">
              {d.daily.map((x) => (
                <div key={x.date} title={`${x.date}: ${x.rate ?? "—"}%`} className="flex h-full min-w-[10px] flex-1 items-end rounded bg-bg">
                  <div className="w-full rounded" style={{ height: `${x.rate ?? 0}%`, background: "var(--brand)" }} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-x-auto">
            <h2 className="p-5 pb-3 font-display text-lg font-bold">{t("rep.students")}</h2>
            <table className="w-full text-sm">
              <thead className="border-y border-line text-muted">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">{t("c.name")}</th>
                  <th className="px-4 py-2 text-start font-medium">{t("c.class")}</th>
                  {STATUSES.map((s) => <th key={s} className="px-3 py-2 text-center font-medium">{t(`status.${s}`)}</th>)}
                  <th className="px-3 py-2 text-center font-medium">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.students.map((s) => (
                  <tr key={s.id} className="cursor-pointer hover:bg-bg" onClick={() => setSel(s)}>
                    <td className="px-4 py-2.5 font-medium">{s.name}</td>
                    <td className="px-4 py-2.5">{s.className}</td>
                    <td className="px-3 py-2.5 text-center">{nf.format(s.present)}</td>
                    <td className="px-3 py-2.5 text-center" style={s.absent ? { color: "var(--absent)", fontWeight: 600 } : undefined}>{nf.format(s.absent)}</td>
                    <td className="px-3 py-2.5 text-center">{nf.format(s.late)}</td>
                    <td className="px-3 py-2.5 text-center">{nf.format(s.excused)}</td>
                    <td className="px-3 py-2.5 text-center">{s.rate === null ? "—" : nf.format(s.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Modal open={!!sel} title={sel ? `${t("rep.records")}: ${sel.name}` : ""} onClose={() => setSel(null)}>
        {detail.isLoading && <Spinner />}
        {detail.isError && <ErrorNote text={err(detail.error)} />}
        {detail.data && (
          <ul className="divide-y divide-line text-sm">
            {detail.data.records.map((r) => (
              <li key={r.date} className="flex items-center justify-between gap-3 py-2">
                <span dir="ltr">{r.date}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{r.note}</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
