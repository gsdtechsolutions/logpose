export let apiKey: string | undefined;
export let baseUrl: string = "";

export function setApiKey(key: string) {
    apiKey = key;
}

export function setBaseUrl(url: string) {
    // Normalize: strip trailing slash and ensure no double /api
    baseUrl = url.replace(/\/+$/, "");
}

export function getApiKey(): string {
    if (!apiKey) {
        throw new Error(
            "Log Pose API Key not configured. " +
            "Provide it via --api-key argument or LOGPOSE_API_KEY environment variable."
        );
    }
    return apiKey;
}

export function getBaseUrl(): string {
    if (!baseUrl) {
        throw new Error(
            "Log Pose base URL not configured. " +
            "Provide it via --base-url argument or LOGPOSE_BASE_URL environment variable."
        );
    }
    return baseUrl;
}
