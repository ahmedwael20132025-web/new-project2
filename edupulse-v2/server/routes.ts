import { Router } from "express";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AttendanceStatus } from "@prisma/client";
import {
  prisma, ah, auth, authLoose, adminOnly, signToken, COOKIE, cookieOpts,
  accessibleClassIds, canAccessClass, todayStr, toDate, fmtDate,
} from "./lib";

export const router = Router();

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pwd = z.string().min(8).max(100);
const publicUser = (u: { id: number; username: string; name: string; role: string; mustChangePassword: boolean }) => ({
  id: u.id, username: u.username, name: u.name, role: u.role, mustChangePassword: u.mustChangePassword,
});

/* ───────── Auth ───────── */
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

router.post("/auth/login", loginLimiter, ah(async (req, res) => {
  const b = z.object({ username: z.string().min(1), password: z.string().min(1) }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  const u = await prisma.user.findUnique({ where: { username: b.data.username.trim().toLowerCase() } });
  const ok = u && u.active && (await bcrypt.compare(b.data.password, u.passwordHash));
  if (!u || !ok) return res.status(401).json({ error: "bad_credentials" });
  res.cookie(COOKIE, signToken(u.id), cookieOpts);
  res.json(publicUser(u));
}));

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

router.get("/auth/me", authLoose, (req, res) => res.json(req.user));

router.post("/auth/change-password", authLoose, ah(async (req, res) => {
  const b = z.object({ currentPassword: z.string().min(1), newPassword: pwd }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "weak_password" });
  const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!u || !(await bcrypt.compare(b.data.currentPassword, u.passwordHash))) return res.status(400).json({ error: "bad_current_password" });
  if (b.data.currentPassword === b.data.newPassword) return res.status(400).json({ error: "same_password" });
  const updated = await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash: await bcrypt.hash(b.data.newPassword, 12), mustChangePassword: false },
  });
  res.json(publicUser(updated));
}));

/* Everything below needs a logged-in user with a changed password */
router.use(auth);

/* ───────── Teachers (admin) ───────── */
const teacherSelect = { id: true, username: true, name: true, active: true, mustChangePassword: true, classes: { select: { id: true, name: true } } } as const;

router.get("/teachers", adminOnly, ah(async (_req, res) => {
  res.json(await prisma.user.findMany({ where: { role: "TEACHER" }, select: teacherSelect, orderBy: { name: "asc" } }));
}));

router.post("/teachers", adminOnly, ah(async (req, res) => {
  const b = z.object({
    name: z.string().min(2).max(100),
    username: z.string().min(3).max(40).regex(/^[a-z0-9._-]+$/i),
    password: pwd,
    classIds: z.array(z.number().int()).default([]),
  }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  const username = b.data.username.toLowerCase();
  if (await prisma.user.findUnique({ where: { username } })) return res.status(409).json({ error: "username_taken" });
  const t = await prisma.user.create({
    data: {
      name: b.data.name.trim(), username, role: "TEACHER", mustChangePassword: true,
      passwordHash: await bcrypt.hash(b.data.password, 12),
      classes: { connect: b.data.classIds.map((id) => ({ id })) },
    },
    select: teacherSelect,
  });
  res.status(201).json(t);
}));

router.put("/teachers/:id", adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const b = z.object({
    name: z.string().min(2).max(100).optional(),
    active: z.boolean().optional(),
    password: pwd.optional(),
    classIds: z.array(z.number().int()).optional(),
  }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  const existing = await prisma.user.findFirst({ where: { id, role: "TEACHER" } });
  if (!existing) return res.status(404).json({ error: "not_found" });
  const t = await prisma.user.update({
    where: { id },
    data: {
      name: b.data.name?.trim(),
      active: b.data.active,
      ...(b.data.password ? { passwordHash: await bcrypt.hash(b.data.password, 12), mustChangePassword: true } : {}),
      ...(b.data.classIds ? { classes: { set: b.data.classIds.map((c) => ({ id: c })) } } : {}),
    },
    select: teacherSelect,
  });
  res.json(t);
}));

/* ───────── Classes ───────── */
router.get("/classes", ah(async (req, res) => {
  const ids = await accessibleClassIds(req.user!);
  const rows = await prisma.schoolClass.findMany({
    where: ids === "all" ? {} : { id: { in: ids } },
    include: { teachers: { select: { id: true, name: true } }, _count: { select: { students: { where: { active: true } } } } },
    orderBy: { name: "asc" },
  });
  res.json(rows.map((c) => ({ id: c.id, name: c.name, grade: c.grade, teachers: c.teachers, studentCount: c._count.students })));
}));

const classBody = z.object({ name: z.string().min(1).max(60), grade: z.string().max(40).nullish() });

router.post("/classes", adminOnly, ah(async (req, res) => {
  const b = classBody.safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  if (await prisma.schoolClass.findUnique({ where: { name: b.data.name.trim() } })) return res.status(409).json({ error: "class_exists" });
  res.status(201).json(await prisma.schoolClass.create({ data: { name: b.data.name.trim(), grade: b.data.grade || null } }));
}));

router.put("/classes/:id", adminOnly, ah(async (req, res) => {
  const b = classBody.safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  try {
    res.json(await prisma.schoolClass.update({ where: { id: Number(req.params.id) }, data: { name: b.data.name.trim(), grade: b.data.grade || null } }));
  } catch { res.status(409).json({ error: "class_exists" }); }
}));

router.delete("/classes/:id", adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const [students, att] = await Promise.all([
    prisma.student.count({ where: { classId: id } }),
    prisma.attendance.count({ where: { classId: id } }),
  ]);
  if (students || att) return res.status(409).json({ error: "class_not_empty" });
  await prisma.schoolClass.delete({ where: { id } });
  res.json({ ok: true });
}));

/* ───────── Students ───────── */
const studentBody = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(1).max(30),
  classId: z.number().int(),
  guardianPhone: z.string().max(30).nullish(),
  active: z.boolean().optional(),
});

router.get("/students", ah(async (req, res) => {
  const ids = await accessibleClassIds(req.user!);
  const classId = req.query.classId ? Number(req.query.classId) : undefined;
  if (classId && ids !== "all" && !ids.includes(classId)) return res.status(403).json({ error: "forbidden" });
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const rows = await prisma.student.findMany({
    where: {
      ...(classId ? { classId } : ids === "all" ? {} : { classId: { in: ids } }),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { class: { select: { name: true } } },
    orderBy: [{ classId: "asc" }, { name: "asc" }],
    take: 1000,
  });
  res.json(rows.map((s) => ({ id: s.id, code: s.code, name: s.name, guardianPhone: s.guardianPhone, active: s.active, classId: s.classId, className: s.class.name })));
}));

router.post("/students", adminOnly, ah(async (req, res) => {
  const b = studentBody.safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  if (await prisma.student.findUnique({ where: { code: b.data.code.trim() } })) return res.status(409).json({ error: "code_taken" });
  const s = await prisma.student.create({
    data: { name: b.data.name.trim(), code: b.data.code.trim(), classId: b.data.classId, guardianPhone: b.data.guardianPhone || null },
  });
  res.status(201).json(s);
}));

router.put("/students/:id", adminOnly, ah(async (req, res) => {
  const b = studentBody.safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  const id = Number(req.params.id);
  const clash = await prisma.student.findFirst({ where: { code: b.data.code.trim(), NOT: { id } } });
  if (clash) return res.status(409).json({ error: "code_taken" });
  res.json(await prisma.student.update({
    where: { id },
    data: { name: b.data.name.trim(), code: b.data.code.trim(), classId: b.data.classId, guardianPhone: b.data.guardianPhone || null, active: b.data.active ?? true },
  }));
}));

router.delete("/students/:id", adminOnly, ah(async (req, res) => {
  await prisma.student.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
}));

/* ───────── Attendance ───────── */
router.get("/attendance", ah(async (req, res) => {
  const q = z.object({ classId: z.coerce.number().int(), date: dateStr }).safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "invalid_input" });
  if (!(await canAccessClass(req.user!, q.data.classId))) return res.status(403).json({ error: "forbidden" });
  const [students, records] = await Promise.all([
    prisma.student.findMany({ where: { classId: q.data.classId, active: true }, orderBy: { name: "asc" } }),
    prisma.attendance.findMany({ where: { classId: q.data.classId, date: toDate(q.data.date) } }),
  ]);
  const byStudent = new Map(records.map((r) => [r.studentId, r]));
  res.json({
    saved: records.length > 0,
    rows: students.map((s) => ({
      studentId: s.id, name: s.name, code: s.code,
      status: byStudent.get(s.id)?.status ?? null,
      note: byStudent.get(s.id)?.note ?? "",
    })),
  });
}));

router.put("/attendance", ah(async (req, res) => {
  const b = z.object({
    classId: z.number().int(),
    date: dateStr,
    records: z.array(z.object({
      studentId: z.number().int(),
      status: z.nativeEnum(AttendanceStatus),
      note: z.string().max(200).nullish(),
    })).min(1).max(500),
  }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: "invalid_input" });
  if (!(await canAccessClass(req.user!, b.data.classId))) return res.status(403).json({ error: "forbidden" });
  if (b.data.date > todayStr()) return res.status(400).json({ error: "future_date" });

  const valid = new Set((await prisma.student.findMany({ where: { classId: b.data.classId }, select: { id: true } })).map((s) => s.id));
  const records = b.data.records.filter((r) => valid.has(r.studentId));
  const date = toDate(b.data.date);
  await prisma.$transaction(records.map((r) =>
    prisma.attendance.upsert({
      where: { studentId_date: { studentId: r.studentId, date } },
      create: { studentId: r.studentId, classId: b.data.classId, date, status: r.status, note: r.note || null, markedById: req.user!.id },
      update: { classId: b.data.classId, status: r.status, note: r.note || null, markedById: req.user!.id },
    }),
  ));
  res.json({ saved: records.length });
}));

/* ───────── Reports & dashboard ───────── */
type Counts = { present: number; absent: number; late: number; excused: number };
const emptyCounts = (): Counts => ({ present: 0, absent: 0, late: 0, excused: 0 });
const bump = (c: Counts, s: AttendanceStatus) => { c[s.toLowerCase() as keyof Counts]++; };
const rate = (c: Counts) => {
  const total = c.present + c.absent + c.late + c.excused;
  return total ? Math.round(((c.present + c.late) / total) * 1000) / 10 : null;
};

router.get("/reports/summary", ah(async (req, res) => {
  const q = z.object({ from: dateStr, to: dateStr, classId: z.coerce.number().int().optional() }).safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "invalid_input" });
  const ids = await accessibleClassIds(req.user!);
  if (q.data.classId && ids !== "all" && !ids.includes(q.data.classId)) return res.status(403).json({ error: "forbidden" });

  const classFilter = q.data.classId ? { classId: q.data.classId } : ids === "all" ? {} : { classId: { in: ids } };
  const rows = await prisma.attendance.findMany({
    where: { ...classFilter, date: { gte: toDate(q.data.from), lte: toDate(q.data.to) } },
    include: { student: { select: { id: true, name: true, code: true, class: { select: { name: true } } } } },
    orderBy: { date: "asc" },
  });

  const totals = emptyCounts();
  const perStudent = new Map<number, { id: number; name: string; code: string; className: string } & Counts>();
  const perDay = new Map<string, Counts>();
  for (const r of rows) {
    bump(totals, r.status);
    const d = fmtDate(r.date);
    if (!perDay.has(d)) perDay.set(d, emptyCounts());
    bump(perDay.get(d)!, r.status);
    if (!perStudent.has(r.studentId)) perStudent.set(r.studentId, { id: r.student.id, name: r.student.name, code: r.student.code, className: r.student.class.name, ...emptyCounts() });
    bump(perStudent.get(r.studentId)!, r.status);
  }
  res.json({
    totals: { ...totals, rate: rate(totals) },
    students: [...perStudent.values()].map((s) => ({ ...s, rate: rate(s) })).sort((a, b) => b.absent - a.absent || a.name.localeCompare(b.name, "ar")),
    daily: [...perDay.entries()].map(([date, c]) => ({ date, ...c, rate: rate(c) })),
  });
}));

router.get("/reports/student/:id", ah(async (req, res) => {
  const id = Number(req.params.id);
  const s = await prisma.student.findUnique({ where: { id }, include: { class: { select: { name: true } } } });
  if (!s) return res.status(404).json({ error: "not_found" });
  if (!(await canAccessClass(req.user!, s.classId))) return res.status(403).json({ error: "forbidden" });
  const q = z.object({ from: dateStr, to: dateStr }).safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "invalid_input" });
  const rows = await prisma.attendance.findMany({
    where: { studentId: id, date: { gte: toDate(q.data.from), lte: toDate(q.data.to) } },
    orderBy: { date: "desc" },
  });
  const totals = emptyCounts();
  rows.forEach((r) => bump(totals, r.status));
  res.json({
    student: { id: s.id, name: s.name, code: s.code, className: s.class.name },
    totals: { ...totals, rate: rate(totals) },
    records: rows.map((r) => ({ date: fmtDate(r.date), status: r.status, note: r.note })),
  });
}));

router.get("/dashboard", ah(async (req, res) => {
  const ids = await accessibleClassIds(req.user!);
  const classWhere = ids === "all" ? {} : { id: { in: ids } };
  const attWhere = ids === "all" ? {} : { classId: { in: ids } };
  const today = todayStr();
  const weekAgo = new Date(toDate(today).getTime() - 6 * 86400000);

  const [classes, studentCount, todayRows, weekRows] = await Promise.all([
    prisma.schoolClass.findMany({ where: classWhere, select: { id: true, name: true, _count: { select: { students: { where: { active: true } } } } }, orderBy: { name: "asc" } }),
    prisma.student.count({ where: { active: true, ...(ids === "all" ? {} : { classId: { in: ids } }) } }),
    prisma.attendance.findMany({ where: { ...attWhere, date: toDate(today) }, select: { classId: true, status: true } }),
    prisma.attendance.findMany({ where: { ...attWhere, date: { gte: weekAgo, lte: toDate(today) } }, select: { date: true, status: true } }),
  ]);

  const todayCounts = emptyCounts();
  const markedClasses = new Set<number>();
  todayRows.forEach((r) => { bump(todayCounts, r.status); markedClasses.add(r.classId); });

  const days = new Map<string, Counts>();
  for (let i = 0; i < 7; i++) days.set(fmtDate(new Date(weekAgo.getTime() + i * 86400000)), emptyCounts());
  weekRows.forEach((r) => bump(days.get(fmtDate(r.date))!, r.status));

  res.json({
    today,
    studentCount,
    classCount: classes.length,
    todayCounts: { ...todayCounts, rate: rate(todayCounts) },
    pendingClasses: classes.filter((c) => c._count.students > 0 && !markedClasses.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
    week: [...days.entries()].map(([date, c]) => ({ date, rate: rate(c), ...c })),
  });
}));
