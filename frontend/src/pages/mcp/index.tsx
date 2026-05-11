import { useState } from "react";
import { RiCodeBoxLine } from "@remixicon/react";
import { ApiKeyCard } from "./components/ApiKeyCard";
import { InstallTabs } from "./components/InstallTabs";
import { McpInfoCard } from "./components/McpInfoCard";
import { ApiEndpointsCard } from "./components/ApiEndpointsCard";

export default function McpPage() {
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <RiCodeBoxLine className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MCP & API</h1>
          <p className="text-sm text-muted-foreground">
            Integre o Log Pose com ferramentas de AI via Model Context Protocol
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <ApiKeyCard onKeyGenerated={setApiKey} />
          <McpInfoCard />
        </div>

        {/* Right column */}
        <InstallTabs apiKey={apiKey} />
      </div>

      {/* Bottom section */}
      <ApiEndpointsCard />
    </div>
  );
}
