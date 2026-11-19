// Optional demo data:  npm run db:demo
import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "./lib";

const names = ["أحمد محمود", "فاطمة علي", "محمد إبراهيم", "مريم حسن", "عمر خالد", "نور السيد", "يوسف سامي", "هدى كمال", "كريم عادل", "سلمى طارق"];

async function main() {
  const teacher = await prisma.user.upsert({
    where: { username: "teacher1" },
    update: {},
    create: { username: "teacher1", name: "أ. منى عبد الله", role: "TEACHER", mustChangePassword: true, passwordHash: await bcrypt.hash("Teacher#12345", 12) },
  });
  const cls = await prisma.schoolClass.upsert({
    where: { name: "1/أ" }, update: {}, create: { name: "1/أ", grade: "الصف الأول", teachers: { connect: { id: teacher.id } } },
  });
  for (const [i, name] of names.entries()) {
    await prisma.student.upsert({ where: { code: `S-${1000 + i}` }, update: {}, create: { code: `S-${1000 + i}`, name, classId: cls.id } });
  }
  console.log("Demo data ready. Teacher login: teacher1 / Teacher#12345");
}
main().finally(() => prisma.$disconnect());
