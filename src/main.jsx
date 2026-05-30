import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./kinly-brand.css";
import "./calendar-cleanup.css";
import "./custody-card-refinement.css";
import "./custody-final-pass.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

// The /prototype route is a standalone, mock-data UI prototype. It is rendered
// directly (without the Firebase-backed App tree) so it can be previewed without
// any Firebase environment configuration.
if (window.location.pathname.startsWith("/prototype")) {
  import("./prototype/KinelyHomePrototype.jsx").then(({ default: KinelyHomePrototype }) => {
    root.render(
      <React.StrictMode>
        <KinelyHomePrototype />
      </React.StrictMode>
    );
  });
} else {
  import("./App.jsx").then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
}
