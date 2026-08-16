import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
}: PageHeaderProps) {
  return (
    <div className="space-y-3">

      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {title}
        </h1>

        {description && (
          <p className="text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}