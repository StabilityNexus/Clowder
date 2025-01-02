"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  function toggleTheme() {
    const newTheme = theme === "light" ? "dark" : "light";
    localStorage.setItem("color-scheme", newTheme);
    setTheme(newTheme);
  }

  return (
    <div
      className="flex items-center space-x-4"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      role="button"
    >
      <div className="flex items-center w-20 h-10 rounded-full bg-gray-300 dark:bg-gray-600 relative p-1 cursor-pointer transition-colors active:scale-95">
        <div
          className={`w-8 h-8 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
            theme === "light"
              ? "translate-x-0 bg-white"
              : "translate-x-10 bg-black"
          }`}
        ></div>
        <Sun
          className={`absolute left-2 top-1/2 transform -translate-y-1/2 transition-opacity duration-300 ease-in-out ${
            theme === "light" ? "opacity-100" : "opacity-0"
          }`}
          size={24}
          color="aqua"
        />
        <Moon
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 transition-opacity duration-300 ease-in-out ${
            theme === "light" ? "opacity-0" : "opacity-100"
          }`}
          size={24}
          color="yellow"
        />
      </div>
    </div>
  );
}
