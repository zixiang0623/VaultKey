# VaultKey

TOTP対応パスワード管理アプリ。単一HTMLファイル・ブラウザ内完結(マスターパスワードからPBKDF2で鍵を導出し、AES-GCMで暗号化してlocalStorageに保存)。

## ファイル
- `password_vault.html` — アプリ本体。ブラウザで直接開いて使用
- `vaultkey-sync-worker.js` — Cloudflare Worker。R2をバックエンドにしたクラウド同期エンドポイント(任意)
- `wrangler.toml` — 上記Workerのデプロイ設定

## 主な機能
マスターパスワード保護 / TOTP自動生成(30秒ごと更新・残り時間表示) / パスワード生成 / 強度メーター / 検索・タグ・お気に入り・並び替え / 弱いパスワード・重複検出 / パスワード履歴 / ゴミ箱(30日で自動削除) / 自動ロック / マスターパスワード変更 / 暗号化バックアップの書き出し・読み込み / Cloudflare R2経由のクラウド同期(任意) / ライト・ダークテーマ / キーボードショートカット

## クラウド同期のデプロイ(任意)
```
wrangler r2 bucket create vaultkey-bucket
wrangler secret put VAULT_TOKEN   # 任意の長いランダム文字列
wrangler deploy
```
発行されたWorker URLとトークンをアプリの設定画面に入力すると、暗号文のみをR2経由で同期できます(鍵はサーバーに送信されません)。
