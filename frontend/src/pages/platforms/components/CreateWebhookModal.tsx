import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "@/components/PlatformLogo";

interface CreateWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (platform: "kiwify" | "payt" | "hubla" | "cakto" | "api", name: string) => void;
  isLoading?: boolean;
}

const PLATFORMS_LIST = [
  { id: "kiwify", label: "Kiwify", desc: "Produtos digitais" },
  { id: "payt", label: "PayT", desc: "Gateway pagamento" },
  { id: "hubla", label: "Hubla", desc: "Cursos e comunidades" },
  { id: "cakto", label: "Cakto", desc: "Plataforma de pagamento" },
  { id: "api", label: "API", desc: "Integração direta" },
] as const;

export function CreateWebhookModal({ open, onOpenChange, onCreate, isLoading }: CreateWebhookModalProps) {
  const [platform, setPlatform] = useState<"kiwify" | "payt" | "hubla" | "cakto" | "api" | null>(null);
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform || !name.trim()) return;
    onCreate(platform, name.trim());
    setPlatform(null);
    setName("");
  };

  const handleClose = (v: boolean) => {
    if (!v) { setPlatform(null); setName(""); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Criar Endpoint</DialogTitle>
          <DialogDescription>
            Selecione a plataforma e dê um nome de identificação
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <div className="grid grid-cols-2 gap-2.5">
              {PLATFORMS_LIST.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  disabled={isLoading}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all cursor-pointer",
                    platform === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <PlatformLogo platform={p.id} size="lg" showLabel={false} />
                  <span className="text-sm font-semibold">
                    {p.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-name">Nome de Identificação</Label>
            <Input
              id="webhook-name"
              placeholder="Ex: Kiwify Principal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="off"
            />
          </div>

          {platform && name && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                URL gerada
              </p>
              <code className="text-xs font-mono">
                /api/webhook/{platform}/{"<uuid>"}
              </code>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!platform || !name.trim() || isLoading}>
              {isLoading ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
