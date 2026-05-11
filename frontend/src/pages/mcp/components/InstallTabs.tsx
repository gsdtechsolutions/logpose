import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  RiFileCopyLine,
  RiCheckLine,
  RiTerminalBoxLine,
  RiErrorWarningLine,
} from "@remixicon/react";

// Clients that use our `logpose-mcp install --client <id>` CLI
const JSON_CLIENTS = [
  { id: "claude", label: "Claude Code", configPath: "~/.claude/mcp.json" },
  { id: "gemini", label: "Gemini",      configPath: "~/.gemini/settings.json" },
  { id: "cursor", label: "Cursor",      configPath: "~/.cursor/mcp.json" },
] as const;

type TabId = (typeof JSON_CLIENTS)[number]["id"] | "codex" | "manual";

interface InstallTabsProps {
  apiKey?: string;
}

// ── Inline copy field — same pattern as ApiKeyCard ────────────────────────────
function CopyField({ text, copied, onCopy }: { text: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={text}
        className="font-mono text-xs flex-1"
      />
      <Button variant="outline" size="icon" onClick={onCopy} className="shrink-0">
        {copied
          ? <RiCheckLine className="size-4 text-emerald-500" />
          : <RiFileCopyLine className="size-4" />
        }
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function InstallTabs({ apiKey }: InstallTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("claude");

  const [copied, setCopied] = useState(false);

  const origin   = window.location.origin;
  const keyValue = apiKey || "<SUA_API_KEY>";

  // Claude / Gemini / Cursor: auto-install via our CLI
  const getInstallCommand = (clientId: string) =>
    `npx -y logpose-mcp install --client ${clientId} --api-key ${keyValue} --base-url ${origin}`;

  // Codex: uses its own `codex mcp add` CLI
  const codexCommand =
    `codex mcp add logpose -- npx -y logpose-mcp --api-key ${keyValue} --base-url ${origin}`;

  // Manual: raw JSON
  const manualJson = JSON.stringify(
    {
      mcpServers: {
        logpose: {
          command: "npx",
          args: ["-y", "logpose-mcp", "--api-key", keyValue, "--base-url", origin],
        },
      },
    },
    null,
    4
  );

  const getActiveText = (): string => {
    if (activeTab === "codex")  return codexCommand;
    if (activeTab === "manual") return manualJson;
    return getInstallCommand(activeTab);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(getActiveText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(activeTab === "manual" ? "JSON copiado!" : "Comando copiado!");
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <RiTerminalBoxLine className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Instalar MCP</CardTitle>
            <CardDescription className="text-xs">
              Conecte o Log Pose à sua ferramenta de AI em 1 comando
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
          <TabsList className="h-9">
            {JSON_CLIENTS.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="text-xs px-3">
                {c.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="codex"  className="text-xs px-3">Codex CLI</TabsTrigger>
            <TabsTrigger value="manual" className="text-xs px-3">Manual</TabsTrigger>
          </TabsList>

          {/* ── Claude / Gemini / Cursor ── */}
          {JSON_CLIENTS.map((client) => (
            <TabsContent key={client.id} value={client.id} className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Abra o terminal, cole o comando e pressione{" "}
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Enter</kbd>.
                {" "}O MCP é instalado automaticamente em{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                  {client.configPath}
                </code>
              </p>

              <CopyField
                text={getInstallCommand(client.id)}
                onCopy={handleCopy}
                copied={copied && activeTab === client.id}
              />

              {!apiKey && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <RiErrorWarningLine className="size-3.5" />
                  Gere sua API Key acima — ela será inserida automaticamente no comando.
                </p>
              )}
            </TabsContent>
          ))}

          {/* ── Codex CLI ── */}
          <TabsContent value="codex" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Abra o terminal com o <strong>Codex CLI</strong> instalado, cole e pressione{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">Enter</kbd>.
              {" "}O servidor é salvo em{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">~/.codex/config.toml</code>.
            </p>

            <CopyField
              text={codexCommand}
              onCopy={handleCopy}
              copied={copied && activeTab === "codex"}
            />

            {!apiKey && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <RiErrorWarningLine className="size-3.5" />
                Gere sua API Key acima — ela será inserida automaticamente no comando.
              </p>
            )}
          </TabsContent>

          {/* ── Manual (JSON) ── */}
          <TabsContent value="manual" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Copie o JSON e adicione manualmente no arquivo de configuração do seu cliente dentro
              da chave{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">mcpServers</code>.
            </p>

            <CopyField
              text={manualJson}
              onCopy={handleCopy}
              copied={copied && activeTab === "manual"}
            />

            {!apiKey && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <RiErrorWarningLine className="size-3.5" />
                Gere sua API Key acima para ela aparecer preenchida no JSON.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-5 border-t border-border/50">
          <h4 className="text-sm font-medium mb-3">Como instalar:</h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside ml-1">
            <li>Gere sua API Key acima (se ainda não gerou)</li>
            <li>Selecione o cliente de AI que você usa</li>
            <li>Copie o comando e cole no seu terminal</li>
            <li>Pressione Enter — a configuração é aplicada automaticamente</li>
            <li>Reinicie o cliente de AI — o Log Pose estará disponível</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
