# EDUPULSE — نظام الحضور والغياب

Node/Express + React (TypeScript) + Tailwind + PostgreSQL (Prisma). واجهة عربية RTL مع وضع داكن وإنجليزي اختياري.

## الأدوار
- **المدير (admin):** يدير الفصول والطلاب والمعلمين، ويرى كل التقارير.
- **المعلم:** يسجّل الحضور ويرى الطلاب والتقارير للفصول المسندة إليه فقط.

## التشغيل المحلي
```bash
cp .env.example .env        # عدّل DATABASE_URL و JWT_SECRET
npm install
npx prisma generate
npm run dev                 # الواجهة :5173 والـ API :3001
```
أول تشغيل ينشئ الجداول تلقائيًا ويُنشئ حساب `admin` بكلمة المرور `ADMIN_INITIAL_PASSWORD` (الافتراضي `admin`)، وسيُطلب تغييرها عند أول دخول.
بيانات تجريبية (اختياري): `npm run db:demo`

## النشر على Replit
1. ارفع المشروع إلى GitHub ثم Import في Replit (أو ارفع الـ ZIP مباشرة).
2. أضف قاعدة PostgreSQL، وفي **Secrets** ضع: `DATABASE_URL` و `JWT_SECRET` (نص عشوائي طويل) و `ADMIN_INITIAL_PASSWORD`.
3. Build: `npm run build` — Run: `npm start` (يُنشئ الجداول ثم يشغّل الخادم، ويقدّم الواجهة من نفس المنفذ).
4. Deployments ← Autoscale/Reserved VM، ثم **Custom Domain** وأضف سجلات DNS التي يعرضها Replit.

## ملاحظات أمان
- كلمات المرور مشفّرة بـ bcrypt، والجلسة في كوكي `httpOnly`، وتسجيل الدخول محدود المحاولات.
- يجب ضبط `JWT_SECRET` في الإنتاج وإلا لن يبدأ الخادم.
- غيّر كلمة مرور `admin` فور أول دخول.

## الهيكل
- `prisma/schema.prisma` — النماذج (User, SchoolClass, Student, Attendance)
- `server/` — Express API (`routes.ts` كل المسارات)
- `client/src/` — React (pages, components, lib)
