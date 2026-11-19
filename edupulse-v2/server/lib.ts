import { PrismaClient, Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction, RequestHandler } from "express";

export const prisma = new PrismaClient();

const isProd = process.env.NODE_ENV === "production";
const SECRET = process.env.JWT_SECRET || (isProd ? "" : "dev-only-secret");
if (!SECRET) throw new Error("JWT_SECRET must be set in production");

export const COOKIE = "edupulse_token";
export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd,
  maxAge: 12 * 3600 * 1000,
  path: "/",
};

export type AuthUser = {
  id: number;
  role: Role;
  username: string;
  name: string;
  mustChangePassword: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const signToken = (id: number) => jwt.sign({ sub: id }, SECRET, { expiresIn: "12h" });

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;
export const ah =
  (fn: Handler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

async function loadUser(req: Request): Promise<AuthUser | null> {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const p = jwt.verify(token, SECRET) as unknown as { sub: number };
    const u = await prisma.user.findUnique({ where: { id: p.sub } });
    if (!u || !u.active) return null;
    return { id: u.id, role: u.role, username: u.username, name: u.name, mustChangePassword: u.mustChangePassword };
  } catch {
    return null;
  }
}

/** Requires login but allows users who still must change their password. */
export const authLoose: RequestHandler = ah(async (req, res, next) => {
  const u = await loadUser(req);
  if (!u) return res.status(401).json({ error: "unauthenticated" });
  req.user = u;
  next();
});

/** Requires login AND a changed password. */
export const auth: RequestHandler = ah(async (req, res, next) => {
  const u = await loadUser(req);
  if (!u) return res.status(401).json({ error: "unauthenticated" });
  if (u.mustChangePassword) return res.status(403).json({ error: "password_change_required" });
  req.user = u;
  next();
});

export const adminOnly: RequestHandler = (req, res, next) =>
  req.user?.role === "ADMIN" ? next() : res.status(403).json({ error: "forbidden" });

/** Admin sees every class; a teacher only the classes assigned to them. */
export async function accessibleClassIds(user: AuthUser): Promise<number[] | "all"> {
  if (user.role === "ADMIN") return "all";
  const rows = await prisma.schoolClass.findMany({ where: { teachers: { some: { id: user.id } } }, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function canAccessClass(user: AuthUser, classId: number) {
  const ids = await accessibleClassIds(user);
  return ids === "all" || ids.includes(classId);
}

const TZ = process.env.SCHOOL_TZ || "Africa/Cairo";
export const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
export const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
