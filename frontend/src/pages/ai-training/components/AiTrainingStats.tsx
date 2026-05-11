import { Card, CardContent } from "@/components/ui/card";
import { RiBrainLine, RiFlashlightLine, RiLineChartLine, RiDatabase2Line } from "@remixicon/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AiTrainingLevel } from "@/services/integrations";

interface Props {
  training: AiTrainingLevel | null;
  isLoading: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, sub, highlight }: StatCardProps) {
  return (
    <Card className={`border-border/40 ${highlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-md p-2 ${highlight ? "bg-primary/10" : "bg-muted"}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground/70 leading-tight">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card className="border-border/40">
      <CardContent className="p-4 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AiTrainingStats({ training, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const count = training?.count ?? 0;
  const maxRecords = training?.max_records ?? 90;
  const percentage = training?.percentage ?? 0;
  const remaining = Math.max(0, maxRecords - count);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<RiBrainLine className="size-5 text-primary" />}
        label="Nível Atual"
        value={training?.level ?? "—"}
        highlight
      />
      <StatCard
        icon={<RiLineChartLine className="size-5 text-muted-foreground" />}
        label="Progresso"
        value={`${percentage}%`}
        sub="do treinamento completo"
      />
      <StatCard
        icon={<RiDatabase2Line className="size-5 text-muted-foreground" />}
        label="Ações Registradas"
        value={String(count)}
        sub={`de ${maxRecords} necessárias`}
      />
      <StatCard
        icon={<RiFlashlightLine className="size-5 text-muted-foreground" />}
        label="Para Completar"
        value={remaining === 0 ? "Completo!" : String(remaining)}
        sub={remaining === 0 ? "Treinamento finalizado" : "ações restantes"}
      />
    </div>
  );
}
