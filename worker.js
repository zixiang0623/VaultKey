// VaultKey — Cloudflare Worker
// public/ 以下の静的アセット(index.html)配信と、/vault の同期APIを1つのWorkerで担う。
// R2には暗号化済みJSON(salt/iv/ct)だけが保存され、マスターパスワードや復号鍵は送信されない。
//
// 同期の安全策(楽観的排他制御):
//   GET  … 本体と一緒に ETag を返す
//   PUT  … If-Match に ETag が付いていれば、サーバー側が変わっていない場合だけ書き込む
//          (他端末が先に更新していたら 412 を返し、クライアントが取り込み直して再送する)

const OBJECT_KEY = "vault.json";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, If-Match",
    "Access-Control-Expose-Headers": "ETag",
    "Cache-Control": "no-store",
  };
}
const plain = (text, status = 200, extra = {}) =>
  new Response(text, { status, headers: { ...cors(), ...extra } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/vault") {
      if (request.method === "OPTIONS") return plain(null, 204);
      if ((request.headers.get("Authorization") || "") !== `Bearer ${env.VAULT_TOKEN}`) {
        return plain("Unauthorized", 401);
      }

      if (request.method === "GET") {
        const obj = await env.BUCKET.get(OBJECT_KEY);
        if (!obj) return plain("null", 200, { "content-type": "application/json" });
        return new Response(obj.body, {
          headers: { ...cors(), "content-type": "application/json", ETag: obj.httpEtag },
        });
      }

      if (request.method === "PUT") {
        const body = await request.text();
        try {
          const p = JSON.parse(body);
          if (!p.salt || !p.iv || !p.ct) throw new Error("invalid shape");
        } catch (e) {
          return plain("Bad Request", 400);
        }
        const opts = { httpMetadata: { contentType: "application/json" } };
        const ifMatch = request.headers.get("If-Match");
        if (ifMatch) opts.onlyIf = { etagMatches: ifMatch.replace(/^W\//, "").replace(/"/g, "") };
        const saved = await env.BUCKET.put(OBJECT_KEY, body, opts);
        if (!saved) return plain("Precondition Failed", 412);
        return plain("OK", 200, { ETag: saved.httpEtag });
      }

      return plain("Method Not Allowed", 405);
    }

    // /vault 以外は静的アセットにフォールバック(通常はここに来る前に自動配信される)
    return env.ASSETS.fetch(request);
  },
};
