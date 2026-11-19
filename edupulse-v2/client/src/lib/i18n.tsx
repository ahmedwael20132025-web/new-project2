import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const ar = {
  tagline: "الحضور والغياب",
  "nav.dashboard": "الرئيسية", "nav.attendance": "تسجيل الحضور", "nav.students": "الطلاب",
  "nav.classes": "الفصول", "nav.teachers": "المعلمون", "nav.reports": "التقارير",
  "auth.username": "اسم المستخدم", "auth.password": "كلمة المرور", "auth.login": "تسجيل الدخول",
  "auth.logout": "خروج", "auth.changeTitle": "غيّر كلمة المرور قبل المتابعة",
  "auth.changeHint": "حسابك يستخدم كلمة مرور مؤقتة. اختر كلمة مرور جديدة من 8 أحرف على الأقل.",
  "auth.current": "كلمة المرور الحالية", "auth.new": "كلمة المرور الجديدة", "auth.confirm": "تأكيد كلمة المرور",
  "auth.mismatch": "كلمتا المرور غير متطابقتين",
  "status.PRESENT": "حاضر", "status.ABSENT": "غائب", "status.LATE": "متأخر", "status.EXCUSED": "بعذر",
  "c.save": "حفظ", "c.cancel": "إلغاء", "c.edit": "تعديل", "c.delete": "حذف", "c.add": "إضافة",
  "c.search": "بحث بالاسم أو الكود", "c.class": "الفصل", "c.allClasses": "كل الفصول", "c.date": "التاريخ",
  "c.from": "من", "c.to": "إلى", "c.name": "الاسم", "c.code": "الكود", "c.phone": "هاتف ولي الأمر",
  "c.active": "نشط", "c.inactive": "موقوف", "c.loading": "جارٍ التحميل…", "c.none": "لا توجد بيانات",
  "c.confirmDelete": "هل أنت متأكد من الحذف؟ لا يمكن التراجع.", "c.grade": "المرحلة", "c.close": "إغلاق",
  "c.students": "طلاب", "c.theme": "تبديل المظهر", "c.lang": "English", "c.saved": "تم الحفظ",
  "dash.title": "نظرة على اليوم", "dash.rate": "نسبة الحضور اليوم", "dash.students": "عدد الطلاب",
  "dash.classes": "عدد الفصول", "dash.pending": "فصول لم يُسجَّل حضورها اليوم",
  "dash.allDone": "تم تسجيل حضور كل الفصول اليوم.", "dash.week": "نسبة الحضور آخر 7 أيام", "dash.record": "سجّل الآن",
  "att.title": "تسجيل الحضور", "att.pick": "اختر فصلًا لبدء التسجيل.", "att.allPresent": "الكل حاضر",
  "att.unmarked": "بدون تسجيل", "att.save": "حفظ الحضور", "att.noStudents": "لا يوجد طلاب نشطون في هذا الفصل.",
  "att.note": "ملاحظة", "att.unsaved": "تغييرات غير محفوظة", "att.saveHint": "سجّل حالة طالب واحد على الأقل ثم احفظ.",
  "stu.title": "الطلاب", "stu.add": "إضافة طالب", "stu.edit": "تعديل الطالب", "stu.empty": "لا يوجد طلاب بعد. أضف أول طالب.",
  "cls.title": "الفصول", "cls.add": "إضافة فصل", "cls.edit": "تعديل الفصل", "cls.empty": "لا توجد فصول بعد. أضف أول فصل.",
  "cls.teachers": "المعلمون",
  "tea.title": "المعلمون", "tea.add": "إضافة معلم", "tea.edit": "تعديل المعلم", "tea.empty": "لا يوجد معلمون بعد.",
  "tea.tempPassword": "كلمة مرور مؤقتة", "tea.resetHint": "اتركها فارغة للإبقاء على كلمة المرور الحالية",
  "tea.classes": "الفصول المسندة", "tea.usernameHint": "حروف إنجليزية وأرقام فقط",
  "rep.title": "التقارير", "rep.rate": "نسبة الحضور", "rep.absences": "غياب", "rep.daily": "الحضور يوميًا",
  "rep.students": "ملخص الطلاب", "rep.export": "تصدير CSV", "rep.print": "طباعة", "rep.records": "سجل الطالب",
  "rep.empty": "لا توجد سجلات حضور في هذه الفترة.",
  "err.bad_credentials": "اسم المستخدم أو كلمة المرور غير صحيحة.",
  "err.bad_current_password": "كلمة المرور الحالية غير صحيحة.",
  "err.weak_password": "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
  "err.same_password": "اختر كلمة مرور مختلفة عن الحالية.",
  "err.username_taken": "اسم المستخدم مستخدم بالفعل.", "err.code_taken": "هذا الكود مستخدم لطالب آخر.",
  "err.class_exists": "يوجد فصل بنفس الاسم.", "err.class_not_empty": "لا يمكن حذف فصل يحتوي طلابًا أو سجلات حضور.",
  "err.future_date": "لا يمكن تسجيل حضور في تاريخ مستقبلي.", "err.forbidden": "ليست لديك صلاحية لهذا الإجراء.",
  "err.invalid_input": "تحقق من البيانات المدخلة.", "err.server_error": "حدث خطأ في الخادم. حاول مرة أخرى.",
  "err.too_many": "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.",
} as const;

type Key = keyof typeof ar;

const en: Record<Key, string> = {
  tagline: "Attendance",
  "nav.dashboard": "Dashboard", "nav.attendance": "Take attendance", "nav.students": "Students",
  "nav.classes": "Classes", "nav.teachers": "Teachers", "nav.reports": "Reports",
  "auth.username": "Username", "auth.password": "Password", "auth.login": "Sign in",
  "auth.logout": "Sign out", "auth.changeTitle": "Change your password to continue",
  "auth.changeHint": "Your account uses a temporary password. Choose a new one with at least 8 characters.",
  "auth.current": "Current password", "auth.new": "New password", "auth.confirm": "Confirm password",
  "auth.mismatch": "Passwords don't match",
  "status.PRESENT": "Present", "status.ABSENT": "Absent", "status.LATE": "Late", "status.EXCUSED": "Excused",
  "c.save": "Save", "c.cancel": "Cancel", "c.edit": "Edit", "c.delete": "Delete", "c.add": "Add",
  "c.search": "Search by name or code", "c.class": "Class", "c.allClasses": "All classes", "c.date": "Date",
  "c.from": "From", "c.to": "To", "c.name": "Name", "c.code": "Code", "c.phone": "Guardian phone",
  "c.active": "Active", "c.inactive": "Inactive", "c.loading": "Loading…", "c.none": "No data",
  "c.confirmDelete": "Delete this item? This can't be undone.", "c.grade": "Grade", "c.close": "Close",
  "c.students": "students", "c.theme": "Toggle theme", "c.lang": "العربية", "c.saved": "Saved",
  "dash.title": "Today at a glance", "dash.rate": "Attendance today", "dash.students": "Students",
  "dash.classes": "Classes", "dash.pending": "Classes not marked today",
  "dash.allDone": "Every class has been marked today.", "dash.week": "Attendance, last 7 days", "dash.record": "Mark now",
  "att.title": "Take attendance", "att.pick": "Choose a class to start.", "att.allPresent": "Mark all present",
  "att.unmarked": "Not marked", "att.save": "Save attendance", "att.noStudents": "This class has no active students.",
  "att.note": "Note", "att.unsaved": "Unsaved changes", "att.saveHint": "Mark at least one student, then save.",
  "stu.title": "Students", "stu.add": "Add student", "stu.edit": "Edit student", "stu.empty": "No students yet. Add the first one.",
  "cls.title": "Classes", "cls.add": "Add class", "cls.edit": "Edit class", "cls.empty": "No classes yet. Add the first one.",
  "cls.teachers": "Teachers",
  "tea.title": "Teachers", "tea.add": "Add teacher", "tea.edit": "Edit teacher", "tea.empty": "No teachers yet.",
  "tea.tempPassword": "Temporary password", "tea.resetHint": "Leave empty to keep the current password",
  "tea.classes": "Assigned classes", "tea.usernameHint": "Letters and numbers only",
  "rep.title": "Reports", "rep.rate": "Attendance rate", "rep.absences": "Absences", "rep.daily": "Daily attendance",
  "rep.students": "Student summary", "rep.export": "Export CSV", "rep.print": "Print", "rep.records": "Student record",
  "rep.empty": "No attendance records in this period.",
  "err.bad_credentials": "Wrong username or password.",
  "err.bad_current_password": "Current password is wrong.",
  "err.weak_password": "Password must be at least 8 characters.",
  "err.same_password": "Choose a password different from the current one.",
  "err.username_taken": "That username is taken.", "err.code_taken": "That code belongs to another student.",
  "err.class_exists": "A class with this name exists.", "err.class_not_empty": "Can't delete a class that has students or attendance records.",
  "err.future_date": "Can't record attendance for a future date.", "err.forbidden": "You don't have permission for this.",
  "err.invalid_input": "Check the entered data.", "err.server_error": "Server error. Try again.",
  "err.too_many": "Too many attempts. Wait a moment and retry.",
};

type Lang = "ar" | "en";
const dicts: Record<Lang, Record<string, string>> = { ar, en };
const Ctx = createContext<{ lang: Lang; t: (k: string) => string; err: (e: unknown) => string; toggle: () => void }>(null!);
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") === "en" ? "en" : "ar"));
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    try { localStorage.setItem("lang", lang); } catch { /* ignore */ }
  }, [lang]);
  const t = (k: string) => dicts[lang][k] ?? k;
  const err = (e: unknown) => {
    const code = (e as { status?: number; code?: string })?.status === 429 ? "too_many" : (e as { code?: string })?.code ?? "server_error";
    return dicts[lang][`err.${code}`] ?? dicts[lang]["err.server_error"];
  };
  return <Ctx.Provider value={{ lang, t, err, toggle: () => setLang((l) => (l === "ar" ? "en" : "ar")) }}>{children}</Ctx.Provider>;
}
