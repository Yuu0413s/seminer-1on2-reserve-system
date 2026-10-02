# 1on2-reserve

ゼミの1on1予約システム。カレンダーから日付を選び、空いている枠を予約する。

- 対象デバイス: スマホ / PC
- デプロイ先: Cloudflare Workers
- 設計: [docs/design/reservation-system.md](docs/design/reservation-system.md)

## セットアップ

### 前提

- [Bun](https://bun.sh/) 1.3 以上

### 手順

```bash
git clone <このリポジトリ>
cd 1on2-reserve
bun install
cp .dev.vars.example .dev.vars   # DATABASE_URL を Neon の接続文字列に書き換える
bun run dev
```

起動後、表示された URL（既定は http://localhost:5173 ）を開き、「API: ok」と表示されれば成功。

> 現時点では DB を使う API が無いため、`.dev.vars` が無くても `bun run dev` は起動する。

## コマンド

| コマンド | 用途 |
|---|---|
| `bun run dev` | 開発サーバー起動（API と画面を同時に配信） |
| `bun test` | テスト実行 |
| `bun run typecheck` | 型チェック |
| `bun run lint` | Lint・整形チェック（`bun run lint:fix` で自動修正） |
| `bun run build` | 本番ビルド |
| `bun run deploy` | ビルドして Cloudflare Workers にデプロイ |
| `bun run cf-typegen` | `wrangler.jsonc` 変更後に Workers の型を再生成 |
| `bun run db:generate` | スキーマからマイグレーションを生成 |
| `bun run db:migrate` | マイグレーションを適用 |

## CI

GitHub Actions（`.github/workflows/ci.yml`）で push / PR 時に Lint・型チェック・テスト・ビルドを実行する。
