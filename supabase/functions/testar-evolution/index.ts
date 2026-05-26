import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ConfigRow = {
  chave: string;
  valor: string | null;
};

const DEFAULT_ALLOWED_ORIGIN = "https://antoniodiascontador.com";
const ALLOWED_ORIGINS = new Set([
  DEFAULT_ALLOWED_ORIGIN,
  "https://www.antoniodiascontador.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function resolveOrigin(req: Request) {
  return req.headers.get("origin")?.replace(/\/$/, "") || null;
}

function isLocalDevOrigin(origin: string | null) {
  if (!origin) return false;

  try {
    const url = new URL(origin);
    return LOCAL_DEV_HOSTS.has(url.hostname) && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
}

function cors(req: Request) {
  const origin = resolveOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin && (ALLOWED_ORIGINS.has(origin) || isLocalDevOrigin(origin)) ? origin : DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function assertAllowedOrigin(req: Request) {
  const origin = resolveOrigin(req);
  if (origin && !ALLOWED_ORIGINS.has(origin) && !isLocalDevOrigin(origin)) {
    return new Response(JSON.stringify({ error: "Origem não autorizada." }), {
      status: 403,
      headers: { ...cors(req), "Content-Type": "application/json" },
    });
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const blocked = assertAllowedOrigin(req);
    if (blocked) return blocked;
    return new Response("ok", { headers: cors(req) });
  }

  const blocked = assertAllowedOrigin(req);
  if (blocked) return blocked;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json(req, { error: "Variaveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: cfgRows, error: cfgError } = await supabase
      .from("configuracoes")
      .select("chave, valor");

    if (cfgError) return json(req, { error: `Erro ao carregar configuracoes: ${cfgError.message}` }, 500);

    const cfg = Object.fromEntries((cfgRows as ConfigRow[] ?? []).map((r) => [r.chave, r.valor ?? ""]));
    const evolutionUrl = trimSlash(cfg.evolution_api_url);
    const instance = cfg.evolution_instance?.trim();
    const token = cfg.evolution_api_token?.trim();
    const number = onlyDigits(cfg.whatsapp_antonio);

    const missing = [
      !evolutionUrl && "Evolution API URL",
      !instance && "Evolution Instance",
      !token && "Evolution API Token",
      !number && "WhatsApp do Antonio",
    ].filter(Boolean);

    if (missing.length > 0) {
      return json(req, { error: `Preencha antes de testar: ${missing.join(", ")}` }, 400);
    }

    const message = [
      "*Teste Evolution API*",
      "",
      "Esta mensagem confirma que a integracao do site Antonio Dias com o WhatsApp esta funcionando.",
      `Data: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    ].join("\n");

    const evolutionRes = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": token },
      body: JSON.stringify({
        number,
        options: { delay: 1000 },
        text: message,
      }),
    });

    const responseText = await evolutionRes.text();
    if (!evolutionRes.ok) {
      return json(req, {
        error: `Evolution retornou ${evolutionRes.status}: ${responseText || evolutionRes.statusText}`,
      }, 502);
    }

    return json(req, {
      ok: true,
      message: `Mensagem de teste enviada para ${number}.`,
      evolution_status: evolutionRes.status,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return json(req, { error: message }, 500);
  }
});

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

function trimSlash(value?: string | null) {
  return (value || "").trim().replace(/\/+$/, "");
}

function onlyDigits(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}
