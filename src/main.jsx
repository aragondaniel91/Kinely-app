import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "@/components/calendar/hiddenEventsPopoverPatch.js";
import "@/components/calendar/weekStartTimeLayoutPatch.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
