import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./kinely-brand.css";

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    const reloadKey = "kinely:last-preload-reload";
    const lastReload = Number(window.sessionStorage.getItem(reloadKey) || 0);
    const shouldReload = Date.now() - lastReload > 10_000;

    if (shouldReload) {
      window.sessionStorage.setItem(reloadKey, String(Date.now()));
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

