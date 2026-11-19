import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ClassRow } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Button, Card, Empty, ErrorNote, Icon, ICONS, Input, Modal, PageHeader, Spinner } from "../components/ui";

type Form = { id?: number; name: string; grade: string };

export default function Classes() {
  const { t, err } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const list = useQuery({ queryKey: ["classes"], queryFn: () => api<ClassRow[]>("/classes") });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["classes"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); };
  const save = useMutation({
    mutationFn: (f: Form) => {
      const body = { name: f.name, grade: f.grade || null };
      return f.id ? api(`/classes/${f.id}`, { method: "PUT", body }) : api("/classes", { method: "POST", body });
    },
    onSuccess: () => { setForm(null); refresh(); },
    onError: (e) => setError(err(e)),
  });
  const del = useMutation({
    mutationFn: (id: number) => api(`/classes/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
    onError: (e) => alert(err(e)),
  });
  const open = (c?: ClassRow) => { setError(""); setForm(c ? { id: c.id, name: c.name, grade: c.grade ?? "" } : { name: "", grade: "" }); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (form) save.mutate(form); };

  return (
    <>
      <PageHeader title={t("cls.title")}>
        <Button onClick={() => open()}><Icon d={ICONS.plus} className="h-4 w-4" />{t("cls.add")}</Button>
      </PageHeader>

      {list.isLoading && <Spinner />}
      {list.isError && <ErrorNote text={err(list.error)} />}
      {list.data && (list.data.length === 0 ? <Card><Empty text={t("cls.empty")} /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.data.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-bold">{c.name}</div>
                  <div className="text-sm text-muted">{c.grade ?? "—"} · {c.studentCount} {t("c.students")}</div>
                </div>
                <div className="whitespace-nowrap text-sm">
                  <button className="px-2 text-brand hover:underline" onClick={() => open(c)}>{t("c.edit")}</button>
                  <button className="px-2 text-absent hover:underline" onClick={() => confirm(t("c.confirmDelete")) && del.mutate(c.id)}>{t("c.delete")}</button>
                </div>
              </div>
              <div className="mt-3 text-sm"><span className="text-muted">{t("cls.teachers")}: </span>{c.teachers.length ? c.teachers.map((x) => x.name).join("، ") : "—"}</div>
            </Card>
          ))}
        </div>
      ))}

      <Modal open={!!form} title={form?.id ? t("cls.edit") : t("cls.add")} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={submit} className="space-y-3">
            {error && <ErrorNote text={error} />}
            <Input label={t("c.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label={t("c.grade")} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
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
