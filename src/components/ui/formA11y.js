import * as React from "react";

export function useStableFieldId(prefix = "kinely-field", explicitId = "") {
  const reactId = React.useId().replace(/:/g, "");
  return explicitId || `${prefix}-${reactId}`;
}

export function inferAutocomplete({ type = "text", name = "", id = "", autoComplete }) {
  if (autoComplete !== undefined) return autoComplete;

  const key = `${name} ${id}`.toLowerCase();

  if (type === "email" || key.includes("email")) return "email";
  if (type === "password" && /(new|confirm|create|signup|register)/.test(key)) return "new-password";
  if (type === "password") return "new-password";
  if (type === "tel" || key.includes("phone")) return "tel";
  if (key.includes("full-name") || key.includes("fullname")) return "name";
  if (/(^|\s|-)name($|\s|-)/.test(key)) return "name";

  return undefined;
}
