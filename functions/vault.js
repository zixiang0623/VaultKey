// Cloudflare Pages Functions
// このファイルは functions/vault.js に置くだけで自動的に /vault にルーティングされる。
// 別ドメインのWorkerを立てる必要はなく、index.htmlと同じCloudflare Pagesプロジェクトとして
// GitHub連携でそのままデプロイできる。
//
// 設定 (Cloudflareダッシュボード > Workers & Pages > このプロジェクト > Settings):
//   Functions > R2 bucket bindings   … 変数名 BUCKET を作成済みのR2バケットに紐付け
//   Environment variables (Secret)   … VAULT_TOKEN に任意の長いランダム文字列を設定
// 設定後、一度 Redeploy すると反映される。
//
// R2に届くのは暗号化済みJSON(salt/iv/ct)だけで、マスターパスワードや復号鍵は送信されない。

const OBJECT_KEY = "vault.json";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}
function unauthorized() {
  return new Response("Unauthorized", { status: 401, headers: corsHeaders() });
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  if (auth !== `Bearer ${env.VAULT_TOKEN}`) return unauthorized();
  const obj = await env.BUCKET.get(OBJECT_KEY);
  if (!obj) {
    return new Response("null", { headers: { "content-type": "application/json", ...corsHeaders() } });
  }
  return new Response(obj.body, { headers: { "content-type": "application/json", ...corsHeaders() } });
}

export async function onRequestPut({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  if (auth !== `Bearer ${env.VAULT_TOKEN}`) return unauthorized();
  const body = await request.text();
  try {
    const parsed = JSON.parse(body);
    if (!parsed.salt || !parsed.iv || !parsed.ct) throw new Error("invalid shape");
  } catch (e) {
    return new Response("Bad Request", { status: 400, headers: corsHeaders() });
  }
  await env.BUCKET.put(OBJECT_KEY, body, { httpMetadata: { contentType: "application/json" } });
  return new Response("OK", { headers: corsHeaders() });
}
