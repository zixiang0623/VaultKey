// VaultKey同期用 Cloudflare Worker
// R2には暗号文（AES-GCM済みJSON）しか届かない。マスターパスワードや復号鍵はサーバーに一切送信されない。
//
// デプロイ手順:
//   1) wrangler r2 bucket create vaultkey-bucket
//   2) wrangler secret put VAULT_TOKEN   (好きな長いランダム文字列を設定。これをアプリ側の「トークン」欄に入力する)
//   3) wrangler deploy
//   4) 表示されたWorkerのURL（https://xxx.workers.dev）をアプリの設定画面「Worker URL」に入力

const OBJECT_KEY = "vault.json";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname !== "/vault") {
      return new Response("Not Found", { status: 404, headers: corsHeaders() });
    }

    const auth = request.headers.get("Authorization") || "";
    if (auth !== `Bearer ${env.VAULT_TOKEN}`) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders() });
    }

    if (request.method === "GET") {
      const obj = await env.BUCKET.get(OBJECT_KEY);
      if (!obj) {
        return new Response("null", { headers: { "content-type": "application/json", ...corsHeaders() } });
      }
      return new Response(obj.body, { headers: { "content-type": "application/json", ...corsHeaders() } });
    }

    if (request.method === "PUT") {
      const body = await request.text();
      // 最低限の形式チェック（salt/iv/ctを含む暗号化済みメタのみ受け付ける）
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
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}
