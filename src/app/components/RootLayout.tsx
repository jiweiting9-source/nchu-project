import { Outlet, NavLink } from "react-router";
import { Calculator, BookOpen, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function RootLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-dvh bg-gray-100 dark:bg-gray-950 transition-colors">
      <div className="flex min-h-dvh w-full flex-col bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-3 md:px-3 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">
              NCHU Study Assistant
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:bg-gray-200 dark:active:bg-gray-600 transition-colors"
            aria-label="切換深色模式"
          >
            {theme === "light" ? (
              <Moon size={20} className="text-gray-700 dark:text-gray-300" />
            ) : (
              <Sun size={20} className="text-yellow-500" />
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>

        <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2 md:px-6 flex justify-around md:justify-center md:gap-8 items-center transition-colors">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`
            }
          >
            <Calculator size={22} />
            <span className="text-xs">學分計算</span>
          </NavLink>

          <NavLink
            to="/course-analysis"
            className={({ isActive }) =>
              `flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`
            }
          >
            <BookOpen size={22} />
            <span className="text-xs">學習型AI</span>
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
