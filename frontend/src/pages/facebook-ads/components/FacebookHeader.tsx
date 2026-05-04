import { RiMetaLine, RiAddCircleLine, RiRefreshLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { FacebookAdsGuide } from "./FacebookAdsGuide";

interface FacebookHeaderProps {
  onAddAccount: () => void;
  onSync: () => void;
  hasAccounts: boolean;
}

export function FacebookHeader({ onAddAccount, onSync, hasAccounts }: FacebookHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[#1877F2]/10 p-2.5">
          <RiMetaLine className="size-5 text-[#1877F2]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facebook Ads</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas contas de anúncio do Facebook
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <FacebookAdsGuide />
        {hasAccounts && (
          <Button variant="outline" onClick={onSync} className="gap-1.5 h-9">
            <RiRefreshLine className="size-4" />
            Sincronizar
          </Button>
        )}
        <Button onClick={onAddAccount} className="gap-1.5 h-9">
          <RiAddCircleLine className="size-4" />
          Adicionar Conta
        </Button>
      </div>
    </div>
  );
}
