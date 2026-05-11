import axios, { AxiosInstance } from "axios";
import { getApiKey, getBaseUrl } from "./state.js";

function getClient(): AxiosInstance {
    const key = getApiKey();
    const url = getBaseUrl();

    return axios.create({
        baseURL: `${url}/api`,
        headers: {
            "X-API-Key": key,
            "Content-Type": "application/json",
        },
        timeout: 30_000,
    });
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function getDashboardOverview(params: Record<string, string | undefined>) {
    const client = getClient();
    const res = await client.get("/external/dashboard/overview", { params });
    return res.data;
}

// ── Sales ──────────────────────────────────────────────────────────────────

export async function getSales(params: Record<string, string | number | undefined>) {
    const client = getClient();
    const res = await client.get("/external/sales", { params });
    return res.data;
}

export async function getSalesSummary(params: Record<string, string | undefined>) {
    const client = getClient();
    const res = await client.get("/external/sales/summary", { params });
    return res.data;
}

// ── Refunds ────────────────────────────────────────────────────────────────

export async function getRefunds(params: Record<string, string | number | undefined>) {
    const client = getClient();
    const res = await client.get("/external/refunds", { params });
    return res.data;
}

// ── Recovery ──────────────────────────────────────────────────────────────

export async function getRecovery(params: Record<string, string | number | undefined>) {
    const client = getClient();
    const res = await client.get("/external/recovery", { params });
    return res.data;
}

// ── Campaigns ─────────────────────────────────────────────────────────────

export async function getCampaignsData(params: Record<string, string | number | undefined>) {
    const client = getClient();
    const res = await client.get("/external/campaigns/data", { params });
    return res.data;
}

export async function getCampaignsSummary(params: Record<string, string | undefined>) {
    const client = getClient();
    const res = await client.get("/external/campaigns/summary", { params });
    return res.data;
}

// ── Database ──────────────────────────────────────────────────────────────

export async function getDbSchema() {
    const client = getClient();
    const res = await client.get("/external/db/schema");
    return res.data;
}

export async function runDbQuery(sql: string) {
    const client = getClient();
    const res = await client.post("/external/db/query", { sql });
    return res.data;
}
