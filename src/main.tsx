import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensureInitialBrandApplied, ensureInitialThemeApplied } from "@/utils/theme";

ensureInitialThemeApplied();
ensureInitialBrandApplied();

createRoot(document.getElementById("root")!).render(<App />);
