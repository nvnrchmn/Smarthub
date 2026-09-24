import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  loading = false,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  valueClassName?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-7 w-28" />
      ) : (
        <p className={`text-2xl font-semibold tracking-tight ${valueClassName ?? ""}`}>{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </CardContent>
  </Card>
);
