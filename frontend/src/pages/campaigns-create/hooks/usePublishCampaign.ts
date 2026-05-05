import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { publishCampaign } from "@/services/campaignCreator";
import type { CampaignFormState } from "./useCampaignForm";
import { generateAdName } from "../utils/naming";
import { buildExportPayload } from "../utils/exportImport";

/**
 * Hook que encapsula a lógica de publicação de campanha.
 * Monta payload (shared ou per-account), envia e trata resultado.
 */
export function usePublishCampaign(
  form: CampaignFormState,
  resetForm: () => void,
) {
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const files = form.ads.map((ad) => ad.file).filter(Boolean) as File[];
      const ads = form.ads.map((ad, i) => ({
        name: ad.name || generateAdName(form.campaignName, i),
        primary_text: ad.primary_text, headline: ad.headline,
        description: ad.description, link: ad.link, utm_params: ad.utm_params,
        extra_params: ad.extra_params, cta_type: ad.cta_type,
        media_type: ad.media_type, media_index: i,
      }));

      // Per-account configs (quando não compartilhado)
      const accountConfigs = !form.sharedMetaConfig && form.accountIds.length > 1
        ? Object.fromEntries(
            form.accountIds.map((id) => {
              const cfg = form.accountMetaConfigs[id] ?? {};
              return [id, {
                pixel_id: cfg.pixelId || "",
                page_id: cfg.pageId || "",
                instagram_actor_id: cfg.instagramActorId || "",
              }];
            })
          )
        : undefined;

      const payload = {
        ...buildExportPayload(form),
        account_ids: form.accountIds,
        campaign_count: form.campaignCount,
        ads,
        ...(accountConfigs ? { account_configs: accountConfigs } : {}),
      };

      const result = await publishCampaign(payload, files);
      if (result.success) {
        const camps = result.campaigns_created ?? 1;
        const accs = form.accountIds.length;
        const accsLabel = accs > 1 ? ` em ${accs} contas` : "";
        const plural = camps > 1 ? `${camps} campanhas` : "1 campanha";
        toast.success(`${plural} criada(s)${accsLabel}! ${result.ads_created} anúncio(s) publicados.`);
        resetForm();
        navigate("/campaigns");
      } else {
        const firstError = result.errors[0] || "Erro desconhecido ao publicar";
        toast.error(firstError);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setIsPublishing(false);
    }
  }, [form, resetForm, navigate]);

  return { isPublishing, handlePublish };
}
