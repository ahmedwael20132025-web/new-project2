const c = (n) => `var(--${n})`;
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"), surface: c("surface"), ink: c("ink"), muted: c("muted"), line: c("line"),
        brand: c("brand"), "on-brand": c("on-brand"),
        present: c("present"), absent: c("absent"), late: c("late"), excused: c("excused"),
        "present-soft": c("present-soft"), "absent-soft": c("absent-soft"),
        "late-soft": c("late-soft"), "excused-soft": c("excused-soft"),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
        display: ['"Reem Kufi"', '"IBM Plex Sans Arabic"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
