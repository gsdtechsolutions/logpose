import { Card, CardContent } from "@/components/ui/card";
import { AiTrainingProgress } from "./AiTrainingHeader";
import type { AiTrainingLevel } from "@/services/integrations";

interface Props {
  training: AiTrainingLevel | null;
  isLoading: boolean;
}

export function AiTrainingProgressCard({ training, isLoading }: Props) {
  return (
    <Card className="border-border/40 hidden sm:block">
      <CardContent className="pt-4 pb-4">
        <AiTrainingProgress training={training} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
}
