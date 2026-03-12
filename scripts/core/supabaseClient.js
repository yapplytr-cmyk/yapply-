let configPromise = null;
let modulePromise = null;
let clientPromise = null;

function getBackendOrigin() {
  const { hostname, port, origin, protocol } = window.location;
  const isLocalFrontend = (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";
  return isLocalFrontend ? `${protocol}//${hostname}:4174` : origin;
}

async function readJson(response, fallbackMessage) {
  try {
    const raw = await response.text();

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return {
        code: response.ok ? undefined : response.status >= 500 ? "SERVER_ERROR" : "UNKNOWN_ERROR",
        message: raw.replace(/\s+/g, " ").trim() || fallbackMessage,
      };
    }
  } catch (error) {
    return {};
  }
}

export function getRuntimeApiOrigin() {
  return getBackendOrigin();
}

export async function getSupabaseRuntimeConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      const response = await fetch(new URL("/api/auth/config", `${getBackendOrigin()}/`).toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });
      const data = await readJson(response, "Supabase configuration could not be loaded.");

      if (!response.ok) {
        const error = new Error(data.message || "Supabase configuration could not be loaded.");
        error.code = data.code || "SUPABASE_NOT_CONFIGURED";
        error.debug = data.debug || null;
        error.reason = data.reason || null;
        throw error;
      }

      return data;
    })();
  }

  return configPromise;
}

async function loadSupabaseModule() {
  if (!modulePromise) {
    modulePromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  }

  return modulePromise;
}

export async function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = Promise.all([getSupabaseRuntimeConfig(), loadSupabaseModule()]).then(([config, module]) =>
      module.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    );
  }

  return clientPromise;
}
