import * as React from "react";

import { useStableFieldId } from "@/components/ui/formA11y";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, id, name, ...props }, ref) => {
  const fieldId = useStableFieldId("kinely-textarea", id);
  const fieldName = name || fieldId;

  return (
    <textarea
      id={fieldId}
      name={fieldName}
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
