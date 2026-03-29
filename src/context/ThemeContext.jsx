import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("vaidyascribe-theme");
    return saved ? saved === "dark" : true; // default: dark
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    localStorage.setItem("vaidyascribe-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = () => setIsDark(d => !d);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Reusable toggle button component
export function ThemeToggleBtn({ style = {} }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font)",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--text2)",
        background: "var(--surface2)",
        border: "1px solid var(--border2)",
        borderRadius: "8px",
        padding: "7px 13px",
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = "var(--text)";
        e.currentTarget.style.borderColor = "var(--green)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = "var(--text2)";
        e.currentTarget.style.borderColor = "var(--border2)";
      }}
    >
      {isDark ? "☀️" : "🌙"}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
