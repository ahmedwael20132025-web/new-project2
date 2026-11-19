import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ClassRow, type TeacherRow } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Button, Card, Empty, ErrorNote, Icon, ICONS, Input, Modal, PageHeader, Spinner } from "../components/ui";

type Form = { id?: number; name: string; username: string; password: string; active: boolean; classIds: number[] };

export default function Teachers() {
  const { t, err } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const list = useQuery({ queryKey: ["teachers"], queryFn: () => api<TeacherRow[]>("/teachers") });
  const classes = useQuery({ queryKey: ["classes"], queryFn: () => api<ClassRow[]>("/classes") });

  const save = useMutation({
    mutationFn: (f: Form) =>
      f.id
        ? api(`/teachers/${f.id}`, { method: "PUT", body: { name: f.name, active: f.active, classIds: f.classIds, ...(f.password && { password: f.password }) } })
        : api("/teachers", { method: "POST", body: { name: f.name, username: f.username, password: f.password, classIds: f.classIds } }),
    onSuccess: () => { setForm(null); qc.invalidateQueries({ queryKey: ["teachers"] }); qc.invalidateQueries({ queryKey: ["classes"] }); },
    onError: (e) => setError(err(e)),
  });

  const open = (x?: TeacherRow) => {
    setError("");
    setForm(x ? { id: x.id, name: x.name, username: x.username, password: "", active: x.active, classIds: x.classes.map((c) => c.id) }
              : { name: "", username: "", password: "", active: true, classIds: [] });
  };
  const toggleClass = (id: number) => form && setForm({ ...form, classIds: form.classIds.includes(id) ? form.classIds.filter((x) => x !== id) : [...form.classIds, id] });
  const submit = (e: FormEvent) => { e.preventDefault(); if (form) save.mutate(form); };

  return (
    <>
      <PageHeader title={t("tea.title")}>
        <Button onClick={() => open()}><Icon d={ICONS.plus} className="h-4 w-4" />{t("tea.add")}</Button>
      </PageHeader>

      {list.isLoading && <Spinner />}
      {list.isError && <ErrorNote text={err(list.error)} />}
      {list.data && (list.data.length === 0 ? <Card><Empty text={t("tea.empty")} /></Card> : (
        <Card className="divide-y divide-line">
          {list.data.map((x) => (
            <div key={x.id} className={`flex flex-wrap items-center justify-between gap-2 p-4 ${x.active ? "" : "opacity-50"}`}>
              <div>
                <div className="font-medium">{x.name} <span className="text-xs text-muted" dir="ltr">@{x.username}</span></div>
                <div className="text-sm text-muted">{x.classes.length ? x.classes.map((c) => c.name).join("، ") : "—"}</div>
              </div>
              <button className="text-sm text-brand hover:underline" onClick={() => open(x)}>{t("c.edit")}</button>
            </div>
          ))}
        </Card>
      ))}

      <Modal open={!!form} title={form?.id ? t("tea.edit") : t("tea.add")} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={submit} className="space-y-3">
            {error && <ErrorNote text={error} />}
            <Input label={t("c.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
            <Input label={t("auth.username")} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required disabled={!!form.id} dir="ltr" autoCapitalize="none" hint={form.id ? undefined : t("tea.usernameHint")} />
            <Input label={t("tea.tempPassword")} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!form.id} minLength={8} dir="ltr" autoComplete="new-password" hint={form.id ? t("tea.resetHint") : undefined} />
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t("tea.classes")}</legend>
              <div className="flex flex-wrap gap-2">
                {classes.data?.map((c) => (
                  <label key={c.id} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${form.classIds.includes(c.id) ? "border-brand bg-brand text-on-brand" : "border-line"}`}>
                    <input type="checkbox" className="sr-only" checked={form.classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />{c.name}
                  </label>
                ))}
              </div>
            </fieldset>
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
