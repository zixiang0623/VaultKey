# VaultKey

TOTP対応パスワード管理アプリ。フロントエンドは単一HTML(`index.html`)でブラウザ内完結(マスターパスワードからPBKDF2で鍵を導出し、AES-GCMで暗号化してlocalStorageに保存)。クラウド同期はCloudflare Pages Functionsで実装しているので、このリポジトリをそのままCloudflareに接続するだけで動く。

## 構成
```
index.html          … アプリ本体
functions/vault.js  … 同期API (Cloudflare Pages Functionsが自動的に /vault にルーティング)
wrangler.toml        … Pages設定 (R2バインディングの雛形)
```

## デプロイ手順 (Cloudflareダッシュボード / Git連携)
1. Cloudflareダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. このリポジトリ (`zixiang0623/VaultKey`) を選択
3. ビルド設定はそのままでOK（フレームワークプリセット: None、ビルドコマンド: 空、出力ディレクトリ: `/`）
4. デプロイ後、プロジェクトの **Settings → Functions → R2 bucket bindings** で
   変数名 `BUCKET` を作成済みのR2バケット(`vaultkey-bucket`など)に紐付ける
5. **Settings → Environment variables** で `VAULT_TOKEN`(任意の長いランダム文字列)を **Secret** として追加
6. 一度 **Redeploy** すると `/vault` エンドポイントが有効になる
7. 発行されたPagesのURL（例: `https://vaultkey.pages.dev`）とトークンを、アプリ内の設定画面「クラウド同期」欄に入力
   （`index.html`と`/vault`は同一オリジンなので、URLはそのままPagesのドメインでよい）

以降はこのリポジトリにpushするたびに自動で再デプロイされる。

## 主な機能
マスターパスワード保護 / TOTP自動生成(30秒ごと更新・残り時間表示リング) / パスワード生成 / 強度メーター / 検索・タグ・お気に入り・並び替え / 弱いパスワード・重複検出 / パスワード履歴 / ゴミ箱(30日で自動削除) / 自動ロック / マスターパスワード変更 / 暗号化バックアップの書き出し・読み込み / Cloudflare R2経由のクラウド同期(任意) / ライト・ダークテーマ / キーボードショートカット
