import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  RiInformationLine, 
  RiCompass3Line, 
  RiBarChartBoxLine, 
  RiDatabase2Line, 
  RiLock2Line 
} from "@remixicon/react";

const TOOLS = [
  {
    icon: RiCompass3Line,
    title: "Navegação de Dados",
    description: "A AI pode consultar suas campanhas, vendas, clientes e reembolsos em tempo real.",
  },
  {
    icon: RiBarChartBoxLine,
    title: "Análise Inteligente",
    description: "Peça à AI para analisar tendências, identificar campanhas problemáticas e comparar períodos.",
  },
  {
    icon: RiDatabase2Line,
    title: "Query Personalizada",
    description: "A AI pode executar SELECTs diretamente no banco para responder perguntas específicas.",
  },
  {
    icon: RiLock2Line,
    title: "Somente Leitura",
    description: "A API externa é 100% read-only. Nenhuma modificação de dados é permitida pelo MCP.",
  },
];

export function McpInfoCard() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <RiInformationLine className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">O que é o MCP?</CardTitle>
            <CardDescription className="text-xs">
              Model Context Protocol — conecte sua AI ao Log Pose
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => (
            <div
              key={tool.title}
              className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <tool.icon className="size-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{tool.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tool.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
