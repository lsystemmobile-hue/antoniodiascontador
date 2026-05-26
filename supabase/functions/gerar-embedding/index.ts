import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ConfigRow = {
  chave: string;
  valor: string | null;
};

type Artigo = {
  titulo: string;
  conteudo: string;
};

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin && (ALLOWED_ORIGINS.has(origin) || isLocalDevOrigin(origin)) ? origin : DEFAULT_ALLOWED_ORIGIN,
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
    const { id } = await req.json();
    if (!id) return json(req, { error: "ID obrigatorio" }, 400);

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
    const geminiKey = cfg.gemini_api_key;
    if (!geminiKey) return json(req, { error: "Gemini API key nao configurada" }, 500);
    const embeddingModel = normalizeModel(cfg.embedding_model);

    const { data: artigo, error: artigoError } = await supabase
      .from("base_conhecimento")
      .select("titulo, conteudo")
      .eq("id", id)
      .single();

    if (artigoError) return json(req, { error: `Erro ao buscar artigo: ${artigoError.message}` }, 500);
    if (!artigo) return json(req, { error: "Artigo nao encontrado" }, 404);

    const { titulo, conteudo } = artigo as Artigo;
    const texto = `${titulo}\n\n${conteudo}`.trim();
    if (!texto) return json(req, { error: "Artigo sem conteudo para gerar embedding" }, 400);

    const embRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: texto }] },
          output_dimensionality: EMBEDDING_DIMENSIONS,
        }),
      }
    );

    if (!embRes.ok) {
      const err = await embRes.text();
      return json(req, { error: `Erro ao gerar embedding: ${err}` }, 500);
    }

    const embData = await embRes.json();
    const embedding = embData.embedding?.values;
    if (!embedding) return json(req, { error: "Embedding nao retornado pelo Gemini" }, 500);

    const { error: updateError } = await supabase
      .from("base_conhecimento")
      .update({ embedding })
      .eq("id", id);
    if (updateError) return json(req, { error: `Erro ao salvar embedding: ${updateError.message}` }, 500);

    return json(req, { ok: true, dimensoes: embedding.length });
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

function normalizeModel(model?: string | null) {
  const value = (model || DEFAULT_EMBEDDING_MODEL).trim().replace(/^models\//, "");
  return value || DEFAULT_EMBEDDING_MODEL;
}
