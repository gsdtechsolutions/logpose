import { Switch } from "@/components/ui/switch";
import { RiArrowDownSFill } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdGroupData } from "@/services/ads";

interface AdNameCellProps {
  ad: AdGroupData;
  isExpanded: boolean;
  blurName: boolean;
  tags?: string[];
  onToggle: (active: boolean) => Promise<void>;
}

export function AdNameCell({
  ad,
  isExpanded,
  blurName,
  tags = [],
  onToggle,
}: AdNameCellProps) {
  const isActive = ad.status === "active";
  const blurClass = "blur-sm select-none";

  const visibleTags = tags.slice(0, 2);
  const remainingCount = tags.length - visibleTags.length;

  return (
    <div className="flex items-center gap-2.5">
      <RiArrowDownSFill
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isExpanded ? "rotate-0" : "-rotate-90"
        )}
      />
      <Switch
        size="sm"
        className="after:pointer-events-none"
        checked={isActive}
        onCheckedChange={async (checked) => {
          await onToggle(checked);
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn("font-medium truncate max-w-[280px] block", blurName && blurClass)}
            title={ad.name}
          >
            {ad.name}
          </span>
          {ad.campaigns_count > 1 ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal">
              {ad.campaigns_count} campanhas
            </Badge>
          ) : ad.instances_count > 1 ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal">
              {ad.instances_count} conjuntos
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground">
            {ad.campaigns_count > 1
              ? `${ad.instances_count} anúncios em ${ad.campaigns_count} campanhas`
              : ad.campaign_names[0] || "1 campanha"}
          </span>
          {visibleTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
            >
              {tag}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              +{remainingCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
