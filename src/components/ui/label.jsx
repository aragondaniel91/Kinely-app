import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";

import { useStableFieldId } from "@/components/ui/formA11y";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

function setForwardedRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) ref.current = value;
}

function findNearbyField(labelNode) {
  const parent = labelNode?.parentElement;
  if (!parent) return null;

  const candidates = Array.from(
    parent.querySelectorAll(
      "input:not([type='hidden']), textarea, select, button[role='combobox'], [role='combobox']"
    )
  ).filter((candidate) => !labelNode.contains(candidate));

  return (
    candidates.find((candidate) => {
      if (typeof Node === "undefined") return true;
      return Boolean(labelNode.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING);
    }) ||
    candidates[0] ||
    null
  );
}

const Label = React.forwardRef(({ className, htmlFor, children, ...props }, ref) => {
  const localRef = React.useRef(null);
  const generatedFieldId = useStableFieldId("kinely-field");
  const [autoHtmlFor, setAutoHtmlFor] = React.useState("");

  React.useLayoutEffect(() => {
    if (htmlFor) return;

    const labelNode = localRef.current;
    const field = findNearbyField(labelNode);
    if (!labelNode || !field) return;

    const fieldId = field.getAttribute("id") || generatedFieldId;
    field.setAttribute("id", fieldId);

    if (!field.getAttribute("name") && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(field.tagName)) {
      field.setAttribute("name", fieldId);
    }

    const labelText = labelNode.textContent?.trim();
    if (labelText && !field.getAttribute("aria-label") && !field.getAttribute("aria-labelledby")) {
      field.setAttribute("aria-label", labelText);
    }

    setAutoHtmlFor(fieldId);
  }, [generatedFieldId, htmlFor, children]);

  return (
    <LabelPrimitive.Root
      ref={(node) => {
        localRef.current = node;
        setForwardedRef(ref, node);
      }}
      htmlFor={htmlFor || autoHtmlFor || undefined}
      className={cn(labelVariants(), className)}
      {...props}
    >
      {children}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
