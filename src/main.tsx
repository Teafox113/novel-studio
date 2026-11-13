import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./gaozhi-tokens.css";
import "./styles.css";
import "./gaozhi.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
