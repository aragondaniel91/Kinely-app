function cleanText(element) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function labelForEvent(button) {
  const text = cleanText(button);
  if (!text) return "Hidden event";

  const match = text.match(/^(.*?)(\d{1,2}:\d{2}\s*[AP]M.*)$/i);
  if (!match) return text;

  return `${match[1].trim()} · ${match[2].trim()}`;
}

function clickOriginalEvent(button) {
  const previousDisplay = button.style.display;
  const previousOpacity = button.style.opacity;
  const previousPointerEvents = button.style.pointerEvents;

  button.style.display = "";
  button.style.opacity = "0";
  button.style.pointerEvents = "none";
  button.click();

  window.setTimeout(() => {
    button.style.display = previousDisplay;
    button.style.opacity = previousOpacity;
    button.style.pointerEvents = previousPointerEvents;
  }, 0);
}

function closeHiddenEventsPanel() {
  document.querySelectorAll("[data-smart-hidden-events-panel]").forEach((panel) => panel.remove());
  document.querySelectorAll("[data-overlap-more-badge]").forEach((badge) => {
    badge.setAttribute("aria-expanded", "false");
  });
}

function applyEventColor(preview, sourceButton) {
  const sourceClass = String(sourceButton.className || "").toLowerCase();
  const sourceText = cleanText(sourceButton).toLowerCase();
  const computedStyle = window.getComputedStyle(sourceButton);
  const background = computedStyle.backgroundColor;
  const textColor = computedStyle.color;
  const borderColor = computedStyle.borderLeftColor || background;

  const hints = [
    { pattern: /(yellow|amber|mom|mama|mamá)/, className: "border-yellow-300 bg-yellow-50 text-yellow-950 hover:bg-yellow-100" },
    { pattern: /(blue|dad|papa|papá)/, className: "border-blue-300 bg-blue-50 text-blue-950 hover:bg-blue-100" },
    { pattern: /(green|family|familia)/, className: "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100" },
    { pattern: /(purple|school|escuela|activity|actividad)/, className: "border-purple-300 bg-purple-50 text-purple-950 hover:bg-purple-100" },
    { pattern: /(red|medical|doctor|médico|medico|important|urgent)/, className: "border-rose-300 bg-rose-50 text-rose-950 hover:bg-rose-100" },
  ];

  const match = hints.find((hint) => hint.pattern.test(sourceClass) || hint.pattern.test(sourceText));
  if (match) {
    preview.className = `${preview.className} ${match.className}`;
    return;
  }

  if (background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
    preview.style.backgroundColor = background;
  }

  if (textColor) preview.style.color = textColor;
  if (borderColor && borderColor !== "rgba(0, 0, 0, 0)" && borderColor !== "transparent") {
    preview.style.borderLeft = `4px solid ${borderColor}`;
  }
}

function buildPanel(badge) {
  const parent = badge.parentElement;
  if (!parent) return null;

  const hiddenEvents = Array.from(parent.querySelectorAll("button.absolute.left-2.right-2")).filter((button) => {
    const style = window.getComputedStyle(button);
    return button.style.display === "none" || style.display === "none";
  });

  if (hiddenEvents.length === 0) return null;

  const panel = document.createElement("div");
  panel.dataset.smartHiddenEventsPanel = "true";
  panel.className = "absolute z-[95] w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-black/5";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "More calendar events");

  const badgeTop = Number.parseFloat(badge.style.top || "96");
  panel.style.top = `${Math.max(96, badgeTop + 34)}px`;
  panel.style.right = "0.5rem";

  const header = document.createElement("div");
  header.className = "mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-2";
  header.innerHTML = `
    <div class="min-w-0">
      <div class="text-xs font-black uppercase tracking-wide text-slate-700">More events</div>
      <div class="mt-0.5 text-[11px] font-semibold text-slate-400">Tap an event to open details</div>
    </div>
  `;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-black leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close hidden events panel");
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeHiddenEventsPanel();
  });

  header.appendChild(closeButton);
  panel.appendChild(header);

  hiddenEvents.forEach((button) => {
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "mb-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-300";
    preview.textContent = labelForEvent(button);
    applyEventColor(preview, button);
    preview.addEventListener("click", (event) => {
      event.stopPropagation();
      closeHiddenEventsPanel();
      clickOriginalEvent(button);
    });
    panel.appendChild(preview);
  });

  const footer = document.createElement("div");
  footer.className = "mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500";
  footer.textContent = "Use Esc or click outside to close.";
  panel.appendChild(footer);

  return panel;
}

if (typeof window !== "undefined" && !window.__familyCalendarHiddenEventsPatchLoaded) {
  window.__familyCalendarHiddenEventsPatchLoaded = true;

  document.addEventListener(
    "click",
    (event) => {
      const badge = event.target?.closest?.("[data-overlap-more-badge]");
      if (!badge) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const isOpen = badge.getAttribute("aria-expanded") === "true";
      closeHiddenEventsPanel();

      if (isOpen) return;

      const panel = buildPanel(badge);
      if (!panel) return;

      badge.parentElement.appendChild(panel);
      badge.setAttribute("aria-expanded", "true");
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target?.closest?.("[data-smart-hidden-events-panel]")) return;
      if (event.target?.closest?.("[data-overlap-more-badge]")) return;
      closeHiddenEventsPanel();
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHiddenEventsPanel();
  });
}
