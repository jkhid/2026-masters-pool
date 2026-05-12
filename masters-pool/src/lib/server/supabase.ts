type SupabaseMethod = "GET" | "POST" | "PATCH" | "DELETE";

export class SupabaseConfigError extends Error {
  constructor() {
    super("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigError();
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
  };
}

export async function supabaseRequest<T>(
  path: string,
  options: {
    method?: SupabaseMethod;
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: unknown;
    prefer?: string;
  } = {},
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const response = await fetch(
    `${url}/rest/v1/${path}${searchParams.size ? `?${searchParams}` : ""}`,
    {
      method: options.method ?? "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        ...(options.prefer ? { Prefer: options.prefer } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase ${response.status}: ${message}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
