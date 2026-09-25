# VaultKey

TOTP対応パスワード管理アプリ。1つのCloudflare Workerで、静的アセット(`public/index.html`)配信と同期API(`/vault`)の両方を担う。フロントエンドはマスターパスワードからPBKDF2で鍵を導出し、AES-GCMで暗号化してlocalStorageに保存(ブラウザ内完結)。

## 構成
```
worker.js       … Workerエントリーポイント。/vault 以外は静的アセットへフォールバック
public/index.html … アプリ本体
wrangler.toml     … Worker設定(静的アセット・R2バインディングの雛形)
```

## デプロイ手順 (Cloudflareダッシュボード / Git連携)
1. Cloudflareダッシュボード → **Workers & Pages** → **Create** → **Workers** で新規作成(名前は仮でOK)、または既存Workerの **Settings → Builds**
2. **Connect to Git** からこのリポジトリ (`zixiang0623/VaultKey`) を接続
3. ビルド設定: ルートディレクトリはそのまま(`wrangler.toml`がある階層)、ビルドコマンドは空でOK
4. デプロイ後、**Settings → Bindings** で R2 bucket bindings を追加し、変数名 `BUCKET` を作成済みのR2バケット(`vaultkey-bucket`など)に紐付け
5. **Settings → Variables and Secrets** で `VAULT_TOKEN`(任意の長いランダム文字列)を **Secret** として追加
6. 反映のため一度 **Redeploy** (以降はpushのたびに自動デプロイ)
7. 発行されたWorkerのURL（例: `https://vaultkey.<subdomain>.workers.dev`）とトークンを、アプリ内の設定画面「クラウド同期」欄に入力
   （`index.html`と`/vault`は同一オリジンなので、URLはそのままWorkerのドメインでよい）

ローカルでデプロイする場合は `wrangler deploy`、シークレットは `wrangler secret put VAULT_TOKEN` でも設定可能。

## 主な機能
マスターパスワード保護 / TOTP自動生成(30秒ごと更新・残り時間表示リング) / パスワード生成 / 強度メーター / 検索・タグ・お気に入り・並び替え / 弱いパスワード・重複検出 / パスワード履歴 / ゴミ箱(30日で自動削除) / 自動ロック / マスターパスワード変更 / 暗号化バックアップの書き出し・読み込み / Cloudflare R2経由のクラウド同期(任意) / ライト・ダークテーマ / キーボードショートカット
