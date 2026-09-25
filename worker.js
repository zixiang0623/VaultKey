// VaultKey — Cloudflare Worker
// public/ 以下の静的アセット(index.html)配信と、/vault の同期APIを1つのWorkerで担う。
// 静的アセットにマッチするリクエストはWorkerを介さず自動配信され、
// マッチしない場合（/vault など）だけこの fetch が呼ばれる。
//
// 設定 (Cloudflareダッシュボード > このWorker > Settings):
//   R2 bucket bindings … 変数名 BUCKET を作成済みのR2バケットに紐付け
//   Variables and Secrets … VAULT_TOKEN に任意の長いランダム文字列をSecretとして追加
//   Git integration (Settings > Builds) で本リポジトリを接続すると、pushのたびに自動デプロイされる
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/vault") {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders() });
      }
      const auth = request.headers.get("Authorization") || "";
      if (auth !== `Bearer ${env.VAULT_TOKEN}`) return unauthorized();

      if (request.method === "GET") {
        const obj = await env.BUCKET.get(OBJECT_KEY);
        if (!obj) {
          return new Response("null", { headers: { "content-type": "application/json", ...corsHeaders() } });
        }
        return new Response(obj.body, { headers: { "content-type": "application/json", ...corsHeaders() } });
      }

      if (request.method === "PUT") {
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

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
    }

    // /vault 以外は静的アセットにフォールバック(通常はここに来る前に自動配信される)
    return env.ASSETS.fetch(request);
  },
};
