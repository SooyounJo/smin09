import { getApiConfig } from "@/lib/api/config";

/**
 * @param {string} path - 절대 URL 또는 `/api/...` 형태의 경로
 * @param {RequestInit & { parseJson?: boolean }} [options]
 */
export async function apiFetch(path, options = {}) {
  const { parseJson = true, headers, ...rest } = options;
  const { baseUrl } = getApiConfig();

  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(rest.body && !(headers && "Content-Type" in headers)
        ? { "Content-Type": "application/json" }
        : null),
      ...headers,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson.error === "string") {
        detail = errJson.error;
      }
    } catch {
      /* ignore */
    }
    const error = new Error(
      detail || `Request failed: ${response.status} ${response.statusText}`
    );
    error.status = response.status;
    throw error;
  }

  if (!parseJson) {
    return response;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text);
}
