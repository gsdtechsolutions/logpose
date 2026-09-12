export interface ColumnPreset {
  id: string;
  name: string;
  columns: string[];
}

export const defaultPresets: ColumnPreset[] = [
  {
    id: "vendas",
    name: "Vendas",
    columns: [
      "name", "spend", "sales", "revenue", "profit", "roas", "cpa", "cpc", "ctr", "lpv", "ic",
    ],
  },
  {
    id: "gargalos",
    name: "Gargalos",
    columns: [
      "name", "clicks", "lpv", "connectRate",
      "ic", "sales",
    ],
  },
];

export const allColumns: Record<string, string> = {
  name: "Anúncio",
  spend: "Gastos",
  sales: "Vendas",
  revenue: "Faturamento",
  profit: "Lucro",
  roas: "ROAS",
  cpa: "CPA",
  cpc: "CPC",
  ctr: "CTR",
  clicks: "Cliques",
  impressions: "Impressões",
  lpv: "LPV",
  ic: "IC",
  connectRate: "Connect Rate",
  budget: "Orçamento",
};
