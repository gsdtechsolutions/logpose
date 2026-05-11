import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RiTerminalBoxLine, RiMegaphoneLine, RiDashboard3Line, RiShoppingCartLine, RiDatabase2Line } from "@remixicon/react";

const ENDPOINT_GROUPS = [
  {
    title: "Campanhas (Meta Ads)",
    value: "campaigns",
    icon: RiMegaphoneLine,
    endpoints: [
      {
        path: "/api/external/campaigns/data",
        description: "Retorna campanhas com métricas de Meta Ads cruzadas com vendas aprovadas.",
      },
      {
        path: "/api/external/campaigns/summary",
        description: "Resumo financeiro e métricas agrupadas por campanha.",
      },
    ]
  },
  {
    title: "Dashboard",
    value: "dashboard",
    icon: RiDashboard3Line,
    endpoints: [
      {
        path: "/api/external/dashboard/overview",
        description: "Retorna KPIs gerais, receita diária e overview da operação.",
      },
    ]
  },
  {
    title: "Transações e Vendas",
    value: "sales",
    icon: RiShoppingCartLine,
    endpoints: [
      {
        path: "/api/external/sales",
        description: "Lista paginada e detalhada de transações de vendas.",
      },
      {
        path: "/api/external/sales/summary",
        description: "KPIs e totais brutos de conversão e receita.",
      },
      {
        path: "/api/external/refunds",
        description: "Lista transações reembolsadas ou com chargeback.",
      },
      {
        path: "/api/external/recovery",
        description: "Dados de carrinhos abandonados e recuperações (Pix pendentes).",
      },
    ]
  },
  {
    title: "Banco de Dados",
    value: "database",
    icon: RiDatabase2Line,
    endpoints: [
      {
        path: "/api/external/db/schema",
        description: "Retorna as definições estruturais (schema) do banco de dados.",
      },
      {
        path: "/api/external/db/query",
        method: "POST",
        description: "Execução segura e somente leitura (SELECT) de queries SQL.",
      },
    ]
  }
];

export function ApiEndpointsCard() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5">
            <RiTerminalBoxLine className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Endpoints Disponíveis</CardTitle>
            <CardDescription className="text-xs">
              Todas as APIs devem ser autenticadas enviando a API Key no header (Authorization: Bearer YOUR_KEY)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {ENDPOINT_GROUPS.map((group) => (
            <AccordionItem key={group.value} value={group.value} className="border-b-0 border-t border-border/30 first:border-t-0">
              <AccordionTrigger className="hover:no-underline hover:bg-muted/30 px-3 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                  <group.icon className="size-4 text-primary" />
                  <span className="font-medium text-sm">{group.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 pt-3 pb-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  {group.endpoints.map((endpoint, i) => (
                    <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-muted/20 p-3 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-2">
                        <Badge variant={endpoint.method === "POST" ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
                          {endpoint.method || "GET"}
                        </Badge>
                        <code className="text-xs font-mono font-medium text-foreground select-all">
                          {endpoint.path}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground pl-1">
                        {endpoint.description}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
