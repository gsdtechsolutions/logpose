import { Badge } from "@/components/ui/badge";
import { RiCheckLine } from "@remixicon/react";
import type { CheckoutAPI } from "@/types/product";

export const CHECKOUT_PLATFORM_LABELS: Record<string, string> = {
  kiwify: "Kiwify",
  payt: "PayT",
  hubla: "Hubla",
  cakto: "Cakto",
};

interface CheckoutOptionProps {
  checkout: CheckoutAPI;
  isSelected: boolean;
  onSelect: () => void;
}

export function CheckoutOption({ checkout, isSelected, onSelect }: CheckoutOptionProps) {
  const displayName = checkout.name || checkout.url;
  const subtitle = checkout.name ? checkout.url : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-2 min-w-0 ${
        isSelected
          ? "bg-primary/10 text-primary ring-1 ring-primary/30"
          : "hover:bg-muted"
      }`}
    >
      <div className="flex items-start sm:items-center gap-2 w-full min-w-0 flex-1">
        <div className="mt-0.5 sm:mt-0 shrink-0">
          {isSelected ? <RiCheckLine className="size-4" /> : <div className="size-4" />}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium break-words line-clamp-2 leading-tight" title={displayName}>
            {displayName}
          </span>
          {subtitle && (
            <span className="text-[10px] text-muted-foreground break-all line-clamp-2 mt-0.5 leading-tight" title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 pl-6 sm:pl-0 shrink-0">
        <Badge variant="outline" className="text-[10px]">
          {CHECKOUT_PLATFORM_LABELS[checkout.platform] ?? checkout.platform}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          R$ {checkout.price.toFixed(2)}
        </Badge>
      </div>
    </button>
  );
}
