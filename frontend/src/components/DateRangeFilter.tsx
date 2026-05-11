import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RiCalendarLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePreset = "today" | "yesterday" | "3d" | "7d" | "30d" | "90d" | "all" | "custom";

export interface DateRangeState {
  preset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export const defaultDateRange: DateRangeState = {
  preset: "today",
  startDate: "",
  endDate: "",
};

const presetLabels: Record<DatePreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "3d": "Últimos 3 dias",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  all: "1 Ano",
  custom: "Personalizado",
};

// Parse YYYY-MM-DD string to Date without timezone shift
function parseLocalDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

// Format Date to YYYY-MM-DD (stored value)
function toYMD(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getDateRangeLabel(state: DateRangeState): string {
  if (state.preset === "custom" && state.startDate && state.endDate) {
    const start = parseLocalDate(state.startDate);
    const end = parseLocalDate(state.endDate);
    if (start && end) {
      return `${format(start, "dd/MM/yyyy", { locale: ptBR })} — ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;
    }
  }
  return presetLabels[state.preset];
}

interface DateRangeFilterProps {
  value: DateRangeState;
  onChange: (value: DateRangeState) => void;
}

// ── Mini calendar picker (reutilizável internamente) ──────────────────────────
function DatePickerField({
  label,
  dateStr,
  onSelect,
  fromDate,
  toDate,
}: {
  label: string;
  dateStr: string;
  onSelect: (ymd: string) => void;
  fromDate?: Date;
  toDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(dateStr);
  const displayLabel = selected
    ? format(selected, "dd/MM/yyyy", { locale: ptBR })
    : "Selecionar";

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full h-9 justify-between font-normal text-xs px-3"
          >
            {displayLabel}
            <RiCalendarLine className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            captionLayout="dropdown"
            defaultMonth={selected ?? toDate}
            locale={ptBR}
            fromDate={fromDate}
            toDate={toDate}
            disabled={[
              ...(fromDate ? [{ before: fromDate }] : []),
              ...(toDate   ? [{ after: toDate }]   : []),
            ]}
            onSelect={(date) => {
              if (!date) return;
              onSelect(toYMD(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const isCustom = value.preset === "custom";

  // Today at midnight — nenhuma data futura permitida
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const startParsed = parseLocalDate(value.startDate);

  const handlePresetChange = (preset: string) => {
    const p = preset as DatePreset;
    if (p === "custom") {
      onChange({ ...value, preset: p });
    } else {
      onChange({ preset: p, startDate: "", endDate: "" });
      setOpen(false);
    }
  };

  const handleStartSelect = (ymd: string) => {
    // Se o fim atual for antes do novo início, limpa o fim
    const newStart = parseLocalDate(ymd);
    const currentEnd = parseLocalDate(value.endDate);
    const endDate =
      currentEnd && newStart && currentEnd >= newStart ? value.endDate : "";
    onChange({ ...value, startDate: ymd, endDate });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-1.5 text-xs font-medium px-3">
          <RiCalendarLine className="size-3.5" />
          {getDateRangeLabel(value)}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={`p-3 space-y-3 transition-all ${isCustom ? "w-[320px]" : "w-[220px]"}`}
        align="end"
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Período</Label>
          <Select value={value.preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(presetLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isCustom && (
          <div className="grid grid-cols-2 gap-2">
            <DatePickerField
              label="Início"
              dateStr={value.startDate}
              toDate={todayDay}
              onSelect={handleStartSelect}
            />
            <DatePickerField
              label="Fim"
              dateStr={value.endDate}
              fromDate={startParsed}
              toDate={todayDay}
              onSelect={(ymd) => onChange({ ...value, endDate: ymd })}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
