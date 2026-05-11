import { useState, useEffect } from "react";
import { RiShieldLine, RiLoader4Line, RiDeleteBinLine, RiWifiLine } from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  fetchProxy,
  saveProxy,
  deleteProxy,
  testProxy,
} from "@/services/integrations";

export function ProxyModal() {
  const [open, setOpen] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyType, setProxyType] = useState("http");
  const [hasProxy, setHasProxy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadProxy();
      setTestResult(null);
    }
  }, [open]);

  const loadProxy = async () => {
    try {
      const data = await fetchProxy();
      if (data) {
        setProxyUrl(data.proxy_url);
        setProxyType(data.proxy_type);
        setHasProxy(true);
      } else {
        setProxyUrl("");
        setProxyType("http");
        setHasProxy(false);
      }
    } catch {
      /* silently fail on load */
    }
  };

  const handleSave = async () => {
    if (!proxyUrl.trim()) {
      toast.error("Informe a URL do proxy");
      return;
    }
    try {
      setIsSaving(true);
      await saveProxy(proxyUrl.trim(), proxyType);
      setHasProxy(true);
      toast.success("Proxy salvo com sucesso!");
      setOpen(false);
    } catch {
      toast.error("Erro ao salvar proxy");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteProxy();
      setProxyUrl("");
      setProxyType("http");
      setHasProxy(false);
      toast.success("Proxy removido");
    } catch {
      toast.error("Erro ao remover proxy");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTest = async () => {
    if (!proxyUrl.trim()) {
      toast.error("Informe a URL do proxy");
      return;
    }
    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await testProxy(proxyUrl.trim(), proxyType);
      setTestResult(result);
      if (result.success) {
        toast.success("Proxy conectou com sucesso!");
      } else {
        toast.error(result.message);
      }
    } catch {
      setTestResult({ success: false, message: "Erro ao testar proxy" });
    } finally {
      setIsTesting(false);
    }
  };

  const placeholder =
    proxyType === "socks5"
      ? "socks5://usuario:senha@127.0.0.1:9999"
      : "http://usuario:senha@127.0.0.1:9999";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5 h-9">
          <RiShieldLine className="size-4" />
          Proxy
          {hasProxy && (
            <span className="ml-1 size-2 rounded-full bg-emerald-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiShieldLine className="size-5" />
            Configurar Proxy
          </DialogTitle>
          <DialogDescription>
            As requisições ao Facebook Ads passarão por este proxy.
            Recomendado usar proxy residencial brasileiro para evitar
            bloqueios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select value={proxyType} onValueChange={setProxyType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP / HTTPS</SelectItem>
                <SelectItem value="socks5">SOCKS5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>URL do Proxy</Label>
            <Input
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder={placeholder}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Formato: {placeholder}
            </p>
          </div>

          {testResult && (
            <div
              className={`rounded-md p-3 text-sm ${
                testResult.success
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {hasProxy && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiDeleteBinLine className="size-4" />
              )}
              Remover
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !proxyUrl.trim()}
              className="gap-1.5"
            >
              {isTesting ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiWifiLine className="size-4" />
              )}
              Testar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !proxyUrl.trim()}
              className="gap-1.5"
            >
              {isSaving && <RiLoader4Line className="size-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
