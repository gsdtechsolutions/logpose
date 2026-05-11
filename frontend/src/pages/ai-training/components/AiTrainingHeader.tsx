import { RiMessageAi3Line, RiBrainLine } from "@remixicon/react";
import { Card, CardContent } from "@/components/ui/card";
import type { AiTrainingLevel } from "@/services/integrations";

const LEVEL_CONFIG: Record<string, { color: string; glow: string; emoji: string; bg: string }> = {
  "Sem dados":     { color: "from-zinc-400 to-zinc-500",      glow: "shadow-zinc-400/20",     emoji: "🔘", bg: "bg-zinc-400" },
  "Iniciante":     { color: "from-red-400 to-orange-400",     glow: "shadow-orange-400/30",   emoji: "🌱", bg: "bg-orange-400" },
  "Aprendendo":    { color: "from-orange-400 to-amber-400",   glow: "shadow-amber-400/30",    emoji: "📚", bg: "bg-amber-400" },
  "Intermediária": { color: "from-amber-400 to-yellow-400",   glow: "shadow-yellow-400/30",   emoji: "⚡", bg: "bg-yellow-400" },
  "Avançada":      { color: "from-yellow-400 to-emerald-400", glow: "shadow-emerald-400/30",  emoji: "🧠", bg: "bg-emerald-400" },
  "Quase lá":      { color: "from-emerald-400 to-cyan-400",   glow: "shadow-cyan-400/30",     emoji: "🚀", bg: "bg-cyan-400" },
  "Treinada":      { color: "from-cyan-400 to-blue-500",      glow: "shadow-blue-500/40",     emoji: "✨", bg: "bg-blue-500" },
};

const LEVELS = [
  "Sem dados", "Iniciante", "Aprendendo", "Intermediária",
  "Avançada", "Quase lá", "Treinada",
];

interface Props {
  training: AiTrainingLevel | null;
  isLoading: boolean;
}

export function AiTrainingHeader({ training, isLoading }: Props) {
  const level = training?.level ?? "Sem dados";
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG["Sem dados"];
  const percentage = training?.percentage ?? 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gradient-to-br ${config.color} p-2.5 shadow-md ${config.glow}`}>
          <RiMessageAi3Line className="size-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LOG POSE AI</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o treinamento e as atividades registradas da inteligência artificial
          </p>
        </div>
      </div>

      {/* Level badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-lg ${isLoading ? "opacity-40" : ""}`}>{config.emoji}</span>
        <div className="text-right">
          <p className="text-sm font-semibold">{isLoading ? "—" : level}</p>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Carregando..." : `${percentage}% de treinamento`}
          </p>
        </div>
      </div>

      {/* Progress section as card below on mobile */}
      <Card className="border-border/40 sm:hidden">
        <CardContent className="pt-4">
          <AiTrainingProgress training={training} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

interface ProgressProps {
  training: AiTrainingLevel | null;
  isLoading: boolean;
}

export function AiTrainingProgress({ training, isLoading }: ProgressProps) {
  const level = training?.level ?? "Sem dados";
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG["Sem dados"];
  const percentage = training?.percentage ?? 0;
  const count = training?.count ?? 0;
  const maxRecords = training?.max_records ?? 90;
  const currentIndex = LEVELS.indexOf(level);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiBrainLine className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Progresso do Treinamento</span>
        </div>
        <span className="text-sm font-bold tabular-nums">
          {isLoading ? "—" : `${count} / ${maxRecords} ações`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${config.color} transition-all duration-1000 ease-out`}
          style={{ width: isLoading ? "0%" : `${percentage}%` }}
        />
        {percentage === 100 && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        )}
      </div>

      {/* Level milestones */}
      <div className="flex items-center justify-between gap-1">
        {LEVELS.map((l, i) => {
          const cfg = LEVEL_CONFIG[l];
          const isPast = i <= currentIndex;
          return (
            <div key={l} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`h-1.5 w-1.5 rounded-full transition-all ${isPast && !isLoading ? `${cfg.bg} shadow-sm` : "bg-muted-foreground/20"}`}
              />
              <span className={`text-[9px] text-center leading-tight hidden sm:block ${isPast && !isLoading ? "text-foreground/70 font-medium" : "text-muted-foreground/40"}`}>
                {l}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
