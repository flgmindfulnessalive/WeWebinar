import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./theme.css";
import "./theme-light.css";
import { applyTheme, initialTheme, loadFonts } from "./ui/fx";

loadFonts();
applyTheme(initialTheme());

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
