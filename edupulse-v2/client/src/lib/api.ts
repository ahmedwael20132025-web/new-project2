export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? "GET",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "server_error");
  return data as T;
}

export type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export const STATUSES: Status[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
export type Counts = { present: number; absent: number; late: number; excused: number };

export type User = { id: number; username: string; name: string; role: "ADMIN" | "TEACHER"; mustChangePassword: boolean };
export type ClassRow = { id: number; name: string; grade: string | null; teachers: { id: number; name: string }[]; studentCount: number };
export type StudentRow = { id: number; code: string; name: string; guardianPhone: string | null; active: boolean; classId: number; className: string };
export type TeacherRow = { id: number; username: string; name: string; active: boolean; classes: { id: number; name: string }[] };

export const todayLocal = () => new Date().toLocaleDateString("en-CA");
export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};
