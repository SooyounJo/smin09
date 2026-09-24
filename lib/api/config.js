/** @typedef {{ baseUrl: string }} ApiConfig */

/** @returns {ApiConfig} */
export function getApiConfig() {
  const baseUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")
      : "";

  return { baseUrl };
}
