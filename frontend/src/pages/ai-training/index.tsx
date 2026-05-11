import { useState, useEffect, useCallback } from "react";
import { AiTrainingHeader } from "./components/AiTrainingHeader";
import { AiTrainingStats } from "./components/AiTrainingStats";
import { AiTrainingProgressCard } from "./components/AiTrainingProgressCard";
import { AiActivitiesTable } from "./components/AiActivitiesTable";
import {
  fetchAiTrainingLevel,
  fetchAiActivities,
  type AiTrainingLevel,
  type AiActivitiesPage,
} from "@/services/integrations";

export default function AiTrainingPage() {
  const [training, setTraining] = useState<AiTrainingLevel | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(true);

  const [activitiesData, setActivitiesData] = useState<AiActivitiesPage | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => {
    fetchAiTrainingLevel()
      .then(setTraining)
      .catch(() => {})
      .finally(() => setTrainingLoading(false));
  }, []);

  const loadActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const data = await fetchAiActivities({
        page,
        per_page: 20,
        action_type: actionFilter === "all" ? undefined : actionFilter,
        entity_type: entityFilter === "all" ? undefined : entityFilter,
      });
      setActivitiesData(data);
    } catch {
      // silently fail
    } finally {
      setActivitiesLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleActionFilter = (v: string) => {
    setPage(1);
    setActionFilter(v);
  };

  const handleEntityFilter = (v: string) => {
    setPage(1);
    setEntityFilter(v);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <AiTrainingHeader training={training} isLoading={trainingLoading} />

      <AiTrainingStats training={training} isLoading={trainingLoading} />

      <AiTrainingProgressCard training={training} isLoading={trainingLoading} />

      <AiActivitiesTable
        data={activitiesData}
        isLoading={activitiesLoading}
        page={page}
        actionFilter={actionFilter}
        entityFilter={entityFilter}
        onPageChange={setPage}
        onActionFilterChange={handleActionFilter}
        onEntityFilterChange={handleEntityFilter}
      />
    </div>
  );
}
