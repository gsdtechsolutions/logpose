import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AccountIdBadges } from "./AccountIdBadges";
import { AutoImportToggle } from "./AutoImportToggle";
import type { DiscoveredAccount } from "@/services/integrations";

export interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (label: string, accountId: string, accessToken: string, businessId?: string) => void;
  onBulkAdd?: (items: { label: string; account_id: string }[], accessToken: string, businessId?: string) => void;
  isLoading?: boolean;
  prefillToken?: string;
}

export function AddAccountModal({
  open, onOpenChange, onAdd, onBulkAdd, isLoading, prefillToken,
}: AddAccountModalProps) {
  const [label, setLabel] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState("");

  const isDuplicate = !!prefillToken;

  useEffect(() => {
    if (open && prefillToken) {
      setAccessToken(prefillToken);
    }
  }, [open, prefillToken]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) return;
    if (accountIds.length === 0) return;

    const bmId = businessId.trim() || undefined;

    if (accountIds.length === 1) {
      const finalLabel = label.trim() || accountIds[0];
      onAdd(finalLabel, accountIds[0], accessToken.trim(), bmId);
    } else if (onBulkAdd) {
      const items = accountIds.map((id) => ({
        label: label.trim() || id,
        account_id: id,
      }));
      onBulkAdd(items, accessToken.trim(), bmId);
    }

    resetFields();
  }, [accessToken, accountIds, businessId, label, onAdd, onBulkAdd]);

  const resetFields = () => {
    setLabel("");
    setBusinessId("");
    setAccountIds([]);
    setAccessToken("");
  };

  const handleClose = (v: boolean) => {
    if (!v) resetFields();
    onOpenChange(v);
  };

  const handleAccountsDiscovered = (accounts: DiscoveredAccount[]) => {
    const newIds = accounts
      .map((a) => a.account_id)
      .filter((id) => !accountIds.includes(id));
    setAccountIds((prev) => [...prev, ...newIds]);
  };

  const canSubmit = accessToken.trim() && accountIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {isDuplicate ? "Duplicar Conta" : "Adicionar Conta"}
          </DialogTitle>
          <DialogDescription>
            {isDuplicate
              ? "Adicione novas contas usando o mesmo Access Token"
              : "Insira os dados da sua conta de anúncios do Facebook"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fb-label">Nome de Identificação</Label>
            <Input
              id="fb-label"
              placeholder="Ex: Conta Principal"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fb-token">Access Token</Label>
            <Input
              id="fb-token"
              type="password"
              placeholder="Cole o token de acesso"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={isLoading || isDuplicate}
              required
              autoComplete="off"
            />
          </div>
          <AutoImportToggle
            accessToken={accessToken}
            onAccountsDiscovered={handleAccountsDiscovered}
            onBusinessIdDiscovered={(id) => setBusinessId(id)}
            disabled={isLoading}
          />

          <AccountIdBadges
            accountIds={accountIds}
            onChange={setAccountIds}
            disabled={isLoading}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading
                ? "Adicionando..."
                : accountIds.length > 1
                  ? `Adicionar ${accountIds.length} Contas`
                  : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
