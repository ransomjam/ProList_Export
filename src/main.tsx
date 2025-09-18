import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensureInitialBrandApplied } from "@/utils/theme";

ensureInitialBrandApplied();

createRoot(document.getElementById("root")!).render(<App />);
