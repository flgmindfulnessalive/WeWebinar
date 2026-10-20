import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./theme.css";
import "./theme-light.css";
import { loadFonts } from "./ui/fx";

loadFonts();
// Vista previa del tema claro: ?tema=claro
if (new URLSearchParams(location.search).get("tema") === "claro") document.documentElement.dataset.theme = "light";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
