import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RiListCheck, RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import type { AiActivity, AiActivitiesPage } from "@/services/integrations";

const ACTION_BADGE: Record<string, string> = {
  budget_increase: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent",
  budget_decrease: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-transparent",
  pause:           "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-transparent",
  activate:        "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent",
};

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <TableRow key={i}>
          {[1, 2, 3, 4, 5, 6].map((j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function ActivityRow({ activity }: { activity: AiActivity }) {
  const badgeClass = ACTION_BADGE[activity.action_type] ?? "border-transparent";

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm leading-tight line-clamp-1">{activity.entity_name}</span>
          <span className="text-[11px] text-muted-foreground">{activity.entity_type_label}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] font-medium ${badgeClass}`}>
          {activity.action_label}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums text-sm text-muted-foreground">
        {activity.budget_before != null && activity.budget_after != null
          ? `R$ ${fmt(activity.budget_before)} → R$ ${fmt(activity.budget_after)}`
          : "—"}
      </TableCell>
      <TableCell className="tabular-nums text-sm">
        <div className="flex flex-col gap-0.5">
          <span>R$ {fmt(activity.spend)}</span>
          <span className="text-[11px] text-muted-foreground">Gasto</span>
        </div>
      </TableCell>
      <TableCell className="tabular-nums text-sm">
        <div className="flex flex-col gap-0.5">
          <span>{fmt(activity.roas)}x</span>
          <span className="text-[11px] text-muted-foreground">
            {activity.sales} vendas
          </span>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {fmtDate(activity.created_at)}
      </TableCell>
    </TableRow>
  );
}

interface Props {
  data: AiActivitiesPage | null;
  isLoading: boolean;
  page: number;
  actionFilter: string;
  entityFilter: string;
  onPageChange: (p: number) => void;
  onActionFilterChange: (v: string) => void;
  onEntityFilterChange: (v: string) => void;
}

export function AiActivitiesTable({
  data, isLoading, page, actionFilter, entityFilter,
  onPageChange, onActionFilterChange, onEntityFilterChange,
}: Props) {
  const isEmpty = !isLoading && (data?.items.length ?? 0) === 0;

  return (
    <Card className="border-border/40 premium-table">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <RiListCheck className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Atividades Registradas</CardTitle>
            {data && (
              <Badge variant="outline" className="text-[10px]">
                {data.total.toLocaleString("pt-BR")} registros
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={onActionFilterChange}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="budget_increase">Aumento de Orçamento</SelectItem>
                <SelectItem value="budget_decrease">Redução de Orçamento</SelectItem>
                <SelectItem value="pause">Pausar</SelectItem>
                <SelectItem value="activate">Ativar</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={onEntityFilterChange}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="campaign">Campanha</SelectItem>
                <SelectItem value="adset">Conjunto</SelectItem>
                <SelectItem value="ad">Anúncio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            <p className="text-xs text-muted-foreground/70">
              Interaja com campanhas (pausar, escalar, ajustar orçamento) para treinar a AI.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead>Gasto</TableHead>
                  <TableHead>ROAS / Vendas</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? <SkeletonRows />
                  : data?.items.map((a) => <ActivityRow key={a.id} activity={a} />)
                }
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Página {page} de {data.pages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="icon" className="h-7 w-7"
                disabled={page <= 1 || isLoading}
                onClick={() => onPageChange(page - 1)}
              >
                <RiArrowLeftSLine className="size-4" />
              </Button>
              <Button
                variant="outline" size="icon" className="h-7 w-7"
                disabled={page >= data.pages || isLoading}
                onClick={() => onPageChange(page + 1)}
              >
                <RiArrowRightSLine className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
