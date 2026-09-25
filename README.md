# VaultKey

TOTP対応パスワード管理アプリ。**Cloudflare Workers 1つ**で、静的アセット(`public/index.html`)の配信と、クラウド同期API(`/vault`)の両方を処理する構成。

フロントエンドはブラウザ内完結(マスターパスワードからPBKDF2で鍵を導出し、AES-GCMで暗号化してlocalStorageに保存)。同期を使う場合も、Workerを経由してR2に届くのは暗号文(salt/iv/ct)だけで、マスターパスワードや復号鍵は送信されない。

## 構成
```
public/index.html   … アプリ本体（静的アセットとして配信される）
worker.js             … /vault 以外は public/ の静的アセットにフォールバック
wrangler.toml         … [[r2_buckets]] でR2バケットを宣言済み。`wrangler deploy`するだけで自動的に紐付く（ダッシュボードでの手動バインド設定は不要）
```

## デプロイ手順
初回のみ、R2バケット作成とトークン設定が必要:
```
wrangler r2 bucket create vaultkey-bucket
wrangler secret put VAULT_TOKEN     # 任意の長いランダム文字列
wrangler deploy
```
以降コードを変更したら `wrangler deploy` だけでOK。R2バインディングは `wrangler.toml` に宣言済みなので、deployのたびに自動的に反映される(ダッシュボードで都度バインドし直す必要はない)。

GitHubにpushするたびに自動デプロイしたい場合は、Workerのダッシュボード → **Settings → Builds → Connect to Git** でこのリポジトリを接続すればよい(Cloudflare Pagesと同様のGit連携がWorkersにもある)。

デプロイ後、発行されたWorkerのURL(`https://vaultkey.<subdomain>.workers.dev`)と、上で設定したトークンを、アプリ内の設定画面「クラウド同期」欄にそのまま入力する(`index.html`と`/vault`は同一オリジン・同一Workerなのでこれで動く)。

## 主な機能
マスターパスワード保護 / TOTP自動生成(30秒ごと更新・残り時間表示リング) / パスワード生成 / 強度メーター / 検索・タグ・お気に入り・並び替え / 弱いパスワード・重複検出 / パスワード履歴 / ゴミ箱(30日で自動削除) / 自動ロック / マスターパスワード変更 / 暗号化バックアップの書き出し・読み込み / Cloudflare R2経由のクラウド同期(任意、自動バインド) / ライト・ダークテーマ / キーボードショートカット
