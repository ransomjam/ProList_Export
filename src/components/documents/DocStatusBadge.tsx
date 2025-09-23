import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocStatus } from "@/mocks/seeds";
import { docStatusClasses, docStatusLabel, type NormalizedDocStatus } from "@/utils/docStatus";

interface DocStatusBadgeProps {
  status: DocStatus | NormalizedDocStatus;
  className?: string;
  muted?: boolean;
}

export const DocStatusBadge = ({ status, className, muted }: DocStatusBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize border bg-background/80 backdrop-blur-sm",
        docStatusClasses(status),
        muted && "opacity-80",
        className,
      )}
    >
      {docStatusLabel(status)}
    </Badge>
  );
};
