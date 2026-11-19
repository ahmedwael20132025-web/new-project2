import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { prisma } from "./lib";
import { router } from "./routes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1); // behind Replit / reverse proxy: correct HTTPS + client IP
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "upgrade-insecure-requests": isProd ? [] : null,
      },
    },
  }),
);
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

app.get("/healthz", (_req, res) => res.send("ok"));
app.use("/api", router);
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

const dist = path.resolve(__dirname, "../dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "server_error" });
});

async function ensureAdmin() {
  if (await prisma.user.findUnique({ where: { username: "admin" } })) return;
  const initial = process.env.ADMIN_INITIAL_PASSWORD || "admin";
  await prisma.user.create({
    data: { username: "admin", name: "مدير النظام", role: "ADMIN", mustChangePassword: true, passwordHash: await bcrypt.hash(initial, 12) },
  });
  console.log('Created initial account "admin" (password must be changed at first login).');
}

const port = Number(process.env.PORT) || (isProd ? 5000 : 3001);
ensureAdmin()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`EDUPULSE listening on :${port}`)))
  .catch((e) => { console.error("Startup failed:", e); process.exit(1); });
