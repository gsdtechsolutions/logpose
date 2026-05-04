import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RiDeleteBinLine, RiFileCopyLine, RiRefreshLine, RiAlertLine,
} from "@remixicon/react";
import type { FacebookAccountAPI } from "@/services/integrations";

interface FacebookTableProps {
  accounts: FacebookAccountAPI[];
  isLoading: boolean;
  onDelete: (account: FacebookAccountAPI) => void;
  onDeleteGroup: (group: FacebookAccountAPI[]) => void;
  onDuplicate: (account: FacebookAccountAPI) => void;
  onSync: (token: string, businessId: string | null) => void;
  onUpdateToken: (group: FacebookAccountAPI[]) => void;
}

function TableSkeleton() {
  return (
    <Card className="border-border/40 premium-table">
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ tokenValid }: { tokenValid: boolean }) {
  if (!tokenValid) {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-transparent text-[10px] font-medium gap-1"
      >
        <RiAlertLine className="size-3" />
        Token inválido
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="bg-[var(--color-success)]/15 text-[var(--color-success)] border-transparent text-[10px] font-medium"
    >
      Conectada
    </Badge>
  );
}

export function FacebookTable({
  accounts, isLoading, onDelete, onDeleteGroup, onDuplicate, onSync, onUpdateToken,
}: FacebookTableProps) {
  if (isLoading) return <TableSkeleton />;

  if (accounts.length === 0) {
    return (
      <Card className="border-border/40 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">
            Nenhuma conta adicionada. Clique em "Adicionar Conta" para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const grouped = useMemo(() => {
    const map: Record<string, FacebookAccountAPI[]> = {};
    for (const account of accounts) {
      if (!map[account.label]) map[account.label] = [];
      map[account.label].push(account);
    }
    return Object.values(map);
  }, [accounts]);

  return (
    <Card className="border-border/40 premium-table">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Account ID</TableHead>
                <TableHead>Adicionada em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((group) => {
                const isInvalid = group.some((a) => !a.token_valid);
                return (
                  <TableRow
                    key={group[0].label}
                    className={isInvalid ? "bg-destructive/5" : undefined}
                  >
                    <TableCell className="font-medium">{group[0].label}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {group.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center gap-1 bg-muted/60 rounded px-2 py-0.5 font-mono text-xs text-muted-foreground"
                          >
                            <span>{account.account_id}</span>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => onDelete(account)}
                                    className="ml-0.5 text-muted-foreground/60 hover:text-destructive transition-colors"
                                  >
                                    <RiDeleteBinLine className="size-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Excluir conta</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="tabular-nums text-muted-foreground">
                      {group[0].created_at
                        ? new Date(group[0].created_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tokenValid={!isInvalid} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {isInvalid && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => onUpdateToken(group)}
                                >
                                  <RiAlertLine className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Atualizar token inválido</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => onDuplicate(group[0])}
                              >
                                <RiFileCopyLine className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Duplicar (mesmo token)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => onSync(group[0].access_token, group[0].business_id)}
                              >
                                <RiRefreshLine className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Sincronizar contas</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => onDeleteGroup(group)}
                              >
                                <RiDeleteBinLine className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{group.length > 1 ? `Excluir todas as ${group.length} contas` : "Excluir conta"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
