import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, STATUSES, todayLocal, type ClassRow, type Status } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Button, Card, Empty, ErrorNote, Input, PageHeader, Select, Spinner, STATUS_VAR } from "../components/ui";

type Resp = { saved: boolean; rows: { studentId: number; name: string; code: string; status: Status | null; note: string }[] };
type Local = Record<number, { status: Status | null; note: string }>;

export default function Attendance() {
  const { t, err } = useI18n();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const classId = Number(sp.get("classId")) || 0;
  const date = sp.get("date") || todayLocal();
  const setParam = (k: string, v: string) => { const n = new URLSearchParams(sp); n.set(k, v); setSp(n, { replace: true }); };

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api<ClassRow[]>("/classes") });
  const att = useQuery({ queryKey: ["att", classId, date], enabled: !!classId, queryFn: () => api<Resp>(`/attendance?classId=${classId}&date=${date}`) });

  const [rows, setRows] = useState<Local>({});
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (att.data) {
      setRows(Object.fromEntries(att.data.rows.map((r) => [r.studentId, { status: r.status, note: r.note }])));
      setDirty(false);
    }
  }, [att.data]);

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, none: 0 };
    Object.values(rows).forEach((r) => (r.status ? c[r.status]++ : c.none++));
    return c;
  }, [rows]);

  const save = useMutation({
    mutationFn: () => api("/attendance", {
      method: "PUT",
      body: {
        classId, date,
        records: Object.entries(rows).filter(([, r]) => r.status).map(([id, r]) => ({ studentId: Number(id), status: r.status, note: r.note || null })),
      },
    }),
    onSuccess: () => {
      setDirty(false); setJustSaved(true); setTimeout(() => setJustSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["att"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["report"] });
    },
  });

  const mark = (id: number, status: Status) => { setRows((r) => ({ ...r, [id]: { ...r[id], status } })); setDirty(true); };
  const setNote = (id: number, note: string) => { setRows((r) => ({ ...r, [id]: { ...r[id], note } })); setDirty(true); };
  const allPresent = () => { setRows((r) => Object.fromEntries(Object.entries(r).map(([id, v]) => [id, { ...v, status: v.status ?? "PRESENT" }]))); setDirty(true); };
  const marked = Object.values(rows).length - counts.none;

  return (
    <>
      <PageHeader title={t("att.title")}>
        <Button variant="ghost" onClick={allPresent} disabled={!att.data?.rows.length}>{t("att.allPresent")}</Button>
      </PageHeader>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Select label={t("c.class")} value={classId || ""} onChange={(e) => setParam("classId", e.target.value)}>
          <option value="" disabled>—</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label={t("c.date")} type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setParam("date", e.target.value)} dir="ltr" />
      </div>

      {!classId && <Card><Empty text={t("att.pick")} /></Card>}
      {classId > 0 && att.isLoading && <Spinner />}
      {att.isError && <ErrorNote text={err(att.error)} />}
      {att.data && att.data.rows.length === 0 && <Card><Empty text={t("att.noStudents")} /></Card>}

      {att.data && att.data.rows.length > 0 && (
        <>
          <Card className="divide-y divide-line">
            {att.data.rows.map((s) => {
              const cur = rows[s.studentId];
              const st = cur?.status ?? null;
              return (
                <div key={s.studentId} className="p-3 sm:flex sm:items-center sm:gap-4" style={{ borderInlineStart: `4px solid ${st ? `var(--${STATUS_VAR[st]})` : "transparent"}` }}>
                  <div className="mb-2 min-w-0 sm:mb-0 sm:flex-1">
                    <div className="truncate font-medium">{s.name}</div>
                    <div className="text-xs text-muted" dir="ltr">{s.code}</div>
                  </div>
                  <div className="flex gap-1.5" role="group" aria-label={s.name}>
                    {STATUSES.map((x) => {
                      const on = st === x; const v = STATUS_VAR[x];
                      return (
                        <button key={x} type="button" aria-pressed={on} onClick={() => mark(s.studentId, x)}
                          className="min-w-[4.25rem] flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition sm:flex-none"
                          style={on ? { background: `var(--${v})`, borderColor: `var(--${v})`, color: "var(--on-status)" } : { borderColor: "var(--line)", color: "var(--muted)" }}>
                          {t(`status.${x}`)}
                        </button>
                      );
                    })}
                  </div>
                  {st && st !== "PRESENT" && (
                    <input value={cur?.note ?? ""} onChange={(e) => setNote(s.studentId, e.target.value)} placeholder={t("att.note")} maxLength={200}
                      className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm sm:mt-0 sm:w-44" />
                  )}
                </div>
              );
            })}
          </Card>

          <div className="no-print sticky bottom-16 z-30 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-lg lg:bottom-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {STATUSES.map((x) => (
                <span key={x} className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `var(--${STATUS_VAR[x]})` }} />
                  {t(`status.${x}`)} <b>{counts[x]}</b>
                </span>
              ))}
              <span className="text-muted">{t("att.unmarked")} <b>{counts.none}</b></span>
            </div>
            <div className="flex items-center gap-3">
              {save.isError && <span className="text-sm text-absent">{err(save.error)}</span>}
              {justSaved && <span className="text-sm text-present">{t("c.saved")}</span>}
              {dirty && !justSaved && <span className="text-sm text-muted">{t("att.unsaved")}</span>}
              <Button onClick={() => save.mutate()} disabled={save.isPending || marked === 0 || !dirty} title={marked === 0 ? t("att.saveHint") : undefined}>{t("att.save")}</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
