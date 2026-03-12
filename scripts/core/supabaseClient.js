let configPromise = null;
let modulePromise = null;
let clientPromise = null;

function getLocalBackendOrigin() {
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:4174`;
}

function getBackendOrigin() {
  const configuredOrigin = window.YAPPLY_AUTH_ORIGIN || document.documentElement.dataset.authOrigin || "";

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const { hostname, port, origin } = window.location;
  const isLocalFrontend = (hostname === "127.0.0.1" || hostname === "localhost") && port === "4173";
  return isLocalFrontend ? getLocalBackendOrigin() : origin;
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
      const response = await fetch(`${getBackendOrigin()}/api/auth/config`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await readJson(response, "Supabase configuration could not be loaded.");

      if (!response.ok) {
        const error = new Error(data.message || "Supabase configuration could not be loaded.");
        error.code = data.code || "SUPABASE_NOT_CONFIGURED";
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
