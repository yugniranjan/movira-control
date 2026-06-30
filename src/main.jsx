import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./paymentConsole/index.css";
import App from "./App";
import { applyTheme, resolveThemeForUser } from "./lib/theme";

const persistedAuth = (() => {
  try {
    const raw = window.localStorage.getItem("authState");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

applyTheme(resolveThemeForUser(persistedAuth?.user));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
