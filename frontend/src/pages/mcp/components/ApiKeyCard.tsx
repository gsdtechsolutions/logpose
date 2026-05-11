import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RiKeyLine,
  RiFileCopyLine,
  RiRefreshLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiEyeOffLine,
  RiCheckLine,
} from "@remixicon/react";
import { apiRequest } from "@/services/api";

interface ApiKeyData {
  has_key: boolean;
  prefix?: string;
  is_active?: boolean;
  created_at?: string;
  last_used_at?: string;
  full_key?: string;
}

interface ApiKeyCardProps {
  onKeyGenerated?: (key: string) => void;
}

export function ApiKeyCard({ onKeyGenerated }: ApiKeyCardProps) {
  const [data, setData] = useState<ApiKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKey = async () => {
    try {
      const res = await apiRequest<ApiKeyData>("/mcp/api-key");
      setData(res);
      if (res.full_key) {
        setRevealed(res.full_key);
        onKeyGenerated?.(res.full_key);
      }
    } catch {
      toast.error("Erro ao carregar API Key");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKey(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiRequest<{ full_key: string; prefix: string }>("/mcp/api-key/generate", {
        method: "POST",
      });
      setRevealed(res.full_key);
      await fetchKey();
      toast.success("API Key gerada com sucesso!");
    } catch {
      toast.error("Erro ao gerar API Key");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await apiRequest("/mcp/api-key/revoke", { method: "DELETE" });
      setData({ has_key: false });
      setRevealed(null);
      toast.success("API Key revogada com sucesso!");
    } catch {
      toast.error("Erro ao revogar API Key");
    } finally {
      setRevoking(false);
    }
  };

  const handleCopy = async () => {
    const keyToCopy = data?.full_key || revealed;
    if (!keyToCopy) return;
    await navigator.clipboard.writeText(keyToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("API Key copiada!");
  };

  const displayKey = data?.full_key || revealed;
  const maskedKey = displayKey
    ? `${displayKey.slice(0, 10)}${"•".repeat(30)}`
    : "";

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <RiKeyLine className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">API Key</CardTitle>
            <CardDescription className="text-xs">
              Use esta chave para integrar o Log Pose com ferramentas externas e AI
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-10 rounded-md bg-muted animate-pulse" />
        ) : data?.has_key ? (
          <>
            {data.last_used_at && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Último uso: {new Date(data.last_used_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Chave</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    value={showKey && displayKey ? displayKey : maskedKey}
                    className="font-mono text-sm pr-10"
                  />
                  {displayKey && (
                    <button
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showKey ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                    </button>
                  )}
                </div>
                {displayKey && (
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <RiCheckLine className="size-4 text-emerald-500" /> : <RiFileCopyLine className="size-4" />}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={generating}>
                    <RiRefreshLine className="size-3.5" />
                    Regerar Chave
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regerar API Key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A chave atual será invalidada imediatamente. Qualquer integração que a utiliza deixará de funcionar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerate} disabled={generating}>
                      Regerar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5" disabled={revoking}>
                    <RiDeleteBinLine className="size-3.5" />
                    Revogar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revogar API Key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A chave será deletada permanentemente. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevoke} className="bg-destructive hover:bg-destructive/80">
                      Revogar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem uma API Key. Gere uma para conectar o Log Pose a ferramentas externas e AI.
            </p>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              <RiKeyLine className="size-4" />
              {generating ? "Gerando..." : "Gerar API Key"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
