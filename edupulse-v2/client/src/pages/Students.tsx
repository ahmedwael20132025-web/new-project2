import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ClassRow, type StudentRow } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Button, Card, Empty, ErrorNote, Icon, ICONS, Input, Modal, PageHeader, Select, Spinner } from "../components/ui";

type Form = { id?: number; name: string; code: string; classId: number; guardianPhone: string; active: boolean };

export default function Students() {
  const { t, err } = useI18n();
  const admin = useAuth().user?.role === "ADMIN";
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api<ClassRow[]>("/classes") });
  const list = useQuery({
    queryKey: ["students", classId, q],
    queryFn: () => api<StudentRow[]>(`/students?${new URLSearchParams({ ...(classId && { classId }), ...(q && { q }) })}`),
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["students"] }); qc.invalidateQueries({ queryKey: ["classes"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const save = useMutation({
    mutationFn: (f: Form) => {
      const body = { name: f.name, code: f.code, classId: f.classId, guardianPhone: f.guardianPhone || null, active: f.active };
      return f.id ? api(`/students/${f.id}`, { method: "PUT", body }) : api("/students", { method: "POST", body });
    },
    onSuccess: () => { setForm(null); refresh(); },
    onError: (e) => setError(err(e)),
  });
  const del = useMutation({ mutationFn: (id: number) => api(`/students/${id}`, { method: "DELETE" }), onSuccess: refresh });

  const open = (s?: StudentRow) => {
    setError("");
    setForm(s ? { id: s.id, name: s.name, code: s.code, classId: s.classId, guardianPhone: s.guardianPhone ?? "", active: s.active }
              : { name: "", code: "", classId: Number(classId) || classes.data?.[0]?.id || 0, guardianPhone: "", active: true });
  };
  const submit = (e: FormEvent) => { e.preventDefault(); if (form) save.mutate(form); };

  return (
    <>
      <PageHeader title={t("stu.title")}>
        {admin && <Button onClick={() => open()} disabled={!classes.data?.length}><Icon d={ICONS.plus} className="h-4 w-4" />{t("stu.add")}</Button>}
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Select aria-label={t("c.class")} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">{t("c.allClasses")}</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input aria-label={t("c.search")} placeholder={t("c.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.isLoading && <Spinner />}
      {list.isError && <ErrorNote text={err(list.error)} />}
      {list.data && (list.data.length === 0 ? <Card><Empty text={t("stu.empty")} /></Card> : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-start text-muted">
              <tr>{[t("c.name"), t("c.code"), t("c.class"), t("c.phone")].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}<th /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.data.map((s) => (
                <tr key={s.id} className={s.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3" dir="ltr">{s.code}</td>
                  <td className="px-4 py-3">{s.className}</td>
                  <td className="px-4 py-3" dir="ltr">{s.guardianPhone ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-end">
                    {admin && (<>
                      <button className="px-2 text-brand hover:underline" onClick={() => open(s)}>{t("c.edit")}</button>
                      <button className="px-2 text-absent hover:underline" onClick={() => confirm(t("c.confirmDelete")) && del.mutate(s.id)}>{t("c.delete")}</button>
                    </>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}

      <Modal open={!!form} title={form?.id ? t("stu.edit") : t("stu.add")} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={submit} className="space-y-3">
            {error && <ErrorNote text={error} />}
            <Input label={t("c.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
            <Input label={t("c.code")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required dir="ltr" />
            <Select label={t("c.class")} value={form.classId} onChange={(e) => setForm({ ...form, classId: Number(e.target.value) })}>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label={t("c.phone")} value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} dir="ltr" inputMode="tel" />
            {form.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> {t("c.active")}
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>{t("c.cancel")}</Button>
              <Button type="submit" disabled={save.isPending}>{t("c.save")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
