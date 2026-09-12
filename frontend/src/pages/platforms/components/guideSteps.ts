export const KIWIFY_STEPS = [
  'Acesse o painel da Kiwify e clique em "Apps"',
  'Clique em "Webhooks"',
  'Clique em "Criar Webhook"',
  "Coloque um nome para o webhook",
  "Cole a URL criada aqui no campo de URL",
  'Deixe marcado "Todos que sou produtor" (já vem marcado)',
  'Em evento, clique em "Selecionar todos" para selecionar todos os eventos',
  "Salve o webhook",
];

export const PAYT_STEPS = [
  'Acesse o painel da PayT e clique em "Ferramentas"',
  'Clique em "Postbacks"',
  'Clique em "Cadastrar" e coloque um nome',
  'Clique em "Selecionar produto" e marque "Todos os produtos"',
  'Em tipo, selecione "PayT V1"',
  "Cole a URL criada aqui no campo de URL",
  "Em eventos, selecione todos",
  'Clique em "Testar URL"',
  'Clique em "Salvar e Voltar"',
];

export const HUBLA_STEPS = [
  'Acesse seu painel na Hubla e navegue até "Integrações" ou "Webhooks"',
  'Clique em "Criar Webhook" e defina um nome de identificação',
  "Cole a URL criada no Log Pose no campo de URL do Webhook",
  "Selecione todos os eventos de Fatura (gerada, paga, falhou, reembolsada, etc.)",
  "Selecione o evento de Lead (carrinho abandonado)",
  'Clique em "Salvar Webhook"',
];

export const CAKTO_STEPS = [
  'Acesse seu painel na Cakto e clique em "Apps" ou "Integrações"',
  'Selecione a opção "Webhooks" e clique em "Criar Webhook"',
  'Defina um nome de identificação para o webhook',
  "Cole a URL gerada no Log Pose no campo de URL do Webhook",
  "Marque todos os eventos (compra aprovada, pix gerado, abandono, reembolso, chargeback, recusado)",
  'Clique em "Salvar"',
];

export const API_FIELDS = [
  { field: "external_id", type: "string", required: true,  desc: "ID único da transação no seu sistema" },
  { field: "status",      type: "string", required: true,  desc: '"approved" | "pending" | "refunded" | "chargeback" | "trial"' },
  { field: "amount",      type: "float",  required: true,  desc: "Valor em reais. Ex: 197.00" },
  { field: "product_external_id", type: "string", required: true, desc: "ID do produto no seu sistema" },
  { field: "product_name",        type: "string", required: true, desc: "Nome do produto (deve coincidir com o cadastrado)" },
  { field: "customer_email",      type: "string", required: true, desc: "E-mail do comprador" },
  { field: "customer_name",       type: "string", required: false, desc: "Nome completo do comprador" },
  { field: "customer_cpf",        type: "string", required: false, desc: "CPF apenas números" },
  { field: "customer_phone",      type: "string", required: false, desc: "Telefone com DDD" },
  { field: "utm_source",          type: "string", required: false, desc: 'Ex: "facebook"' },
  { field: "utm_medium",          type: "string", required: false, desc: 'Ex: "cpc"' },
  { field: "utm_campaign",        type: "string", required: false, desc: "Nome da campanha" },
  { field: "utm_content",         type: "string", required: false, desc: "Criativo / anúncio" },
  { field: "utm_term",            type: "string", required: false, desc: "Termo de busca" },
  { field: "src",                 type: "string", required: false, desc: "SRC personalizado" },
  { field: "checkout_url",        type: "string", required: false, desc: "URL do checkout da venda" },
  { field: "order_bumps",         type: "array",  required: false, desc: '[{ "name": "...", "amount": 27.00 }]' },
];

export const EXAMPLE_PAYLOAD = `POST /api/webhook/api/{slug}
Content-Type: application/json

{
  "external_id": "ORD-001",
  "status": "approved",
  "amount": 197.00,
  "product_external_id": "PROD-001",
  "product_name": "Curso de Marketing",
  "customer_email": "joao@exemplo.com",
  "customer_name": "João da Silva",
  "utm_source": "facebook",
  "utm_campaign": "camp-principal"
}`;
