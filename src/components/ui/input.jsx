import * as React from "react";

import { inferAutocomplete, useStableFieldId } from "@/components/ui/formA11y";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", id, name, autoComplete, ...props }, ref) => {
  const fieldId = useStableFieldId("kinely-input", id);
  const fieldName = name || fieldId;
  const inferredAutocomplete = inferAutocomplete({
    type,
    name: fieldName,
    id: fieldId,
    autoComplete,
  });

  return (
    <input
      id={fieldId}
      name={fieldName}
      type={type}
      autoComplete={inferredAutocomplete}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
