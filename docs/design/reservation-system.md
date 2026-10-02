# 1on1 予約システム 設計メモ

- 作成日: 2026-10-02
- 開発方式: アジャイル（1スプリント = 1週間、金曜ゼミをスプリントレビューとする）
- 対象デバイス: スマホ / PC
- デプロイ先: Cloudflare Workers
- 前身: `seminar-1on1-GAS`（Googleスプレッドシート + GAS）

---

## 1. 目的

ゼミの1on1（発表・相談）予約を、スプレッドシートの日付タブ運用から
「カレンダーで日付を選ぶ → 空き枠を予約する」Webアプリに置き換える。

## 2. ユーザー

- ログイン: **Google ログイン必須**（better-auth）
- 利用可能アカウント: **大学ドメインで制限**（環境変数 `ALLOWED_EMAIL_DOMAIN`、値は未定）
  - Google の `hd` パラメータはヒントに過ぎないため、**サーバー側でメールドメインを必ず検証する**

| 役割 | できること |
|---|---|
| student（学生） | 予約する / 自分の予約を取り消す / 自分の予約一覧を見る |
| teacher（先生） | 予約一覧と相談内容を見る / 「先生からの連絡」を書く |
| admin（管理者） | 開催日の休止・再開 / 枠の編集 / 利用者の役割変更 |

### 公開範囲

| 情報 | 本人 | 他の学生 | 先生・管理者 |
|---|---|---|---|
| 予約者名・学年 | ○ | ○ | ○ |
| 相談内容・要望・先生からの連絡 | ○ | × | ○ |

公開範囲の制御は **APIレスポンスで行う**（フロントで隠すだけにしない）。

## 3. 課題

- 日付ごとにタブが増え続け、目的の日を探しにくい
- 人数が増え、同じセルへの同時書き込み・上書きが起こりうる
- スマホでのスプレッドシート編集は操作しづらい
- 「済」の判定がセル色（グレー）頼みで、手作業のミスが起きやすい

## 4. 機能

### MVP に含める

1. Google ログイン + 初回プロフィール登録（名前・学年。counter と同じ `Shibata(B2)` 形式で表示）
2. カレンダー（月表示）で開催日を選び、日別の枠一覧を見る（空き / 予約済み / 休憩 / 先生からの共有）
3. 空き枠を予約する（相談内容・要望を入力）
4. 自分の予約を取り消す
5. 開催日の管理
   - 毎週金曜を自動生成（時間割テンプレートからコピー）
   - 管理者が休止日を指定
   - 日ごとに枠を編集（種類・時間の変更、「対応不可」化）
6. 先生が予約一覧を閲覧し、「先生からの連絡」を記入
7. 管理者が利用者の役割を変更

### MVP に含めない（S5 以降の候補、優先順）

1. 実施済み管理 + 回数集計（counter の代替）
2. 予約ルールの制限（1日1枠まで、開始後は変更不可 など）
3. 通知・リマインド（メール / Slack）
4. スプレッドシートからのデータ移行

## 5. 画面構成

```
[ログイン] ──(初回のみ)──> [プロフィール登録]
     │                          │
     └────────────┬─────────────┘
                  ▼
        [カレンダー（月表示）]   開催日のみ選択可・空き枠の数を表示
                  │ 日付をタップ
                  ▼
        [日別の枠一覧]          学生・先生で共通。役割で編集できる欄が変わる
           │ 空き枠をタップ
           ▼
        [予約フォーム（ボトムシート）]  相談内容・要望 → 確定

  ヘッダーから:
   ├── [自分の予約一覧]  取り消し
   └── (管理者) [管理画面]
         ├── 開催日の管理（休止、枠の編集）
         └── 利用者の管理（役割の付与）
```

## 6. データ構造（概要）

> 列の型・NULL許容・インデックスなどの詳細は `db-design` で詰める。

```
user（better-auth 管理テーブルに項目を追加）
 ├─ role: student / teacher / admin
 └─ display_name, grade（B1〜M2）

event_days（開催日）               1 ── n   slots（枠）
 ├─ date（UNIQUE）                            ├─ event_day_id → event_days
 └─ status: open / cancelled                  ├─ start_time, end_time
                                              ├─ kind: presentation / break / teacher / unavailable
                                              └─ period_label（3rd 等、NULL可）
                                                    │ 1
                                                    │ 0..1（有効な予約は1枠1件まで）
                                              reservations（予約）
                                               ├─ slot_id → slots
                                               ├─ user_id → user
                                               ├─ consultation, request
                                               ├─ teacher_note
                                               └─ status（取消・実施済の扱いは db-design で決定）
```

- **二重予約は DB 制約（UNIQUE）で防ぐ。** アプリ側の「確認してから INSERT」は TOCTOU になるため採らない
- 時間割テンプレートは MVP ではコード定数（`src/shared/schedule-template.ts`。GAS の `SCHEDULE` を移植）

## 7. API 設計

| メソッド | パス | 権限 | 内容 |
|---|---|---|---|
| `*` | `/api/auth/*` | – | better-auth |
| GET | `/api/me` | ログイン済 | 自分の情報・役割 |
| PUT | `/api/me/profile` | ログイン済 | 名前・学年の登録・更新 |
| GET | `/api/me/reservations` | ログイン済 | 自分の予約一覧 |
| GET | `/api/days?month=YYYY-MM` | ログイン済 | 月内の開催日と空き枠の数 |
| GET | `/api/days/:date` | ログイン済 | その日の枠と予約（相談内容等は権限がある場合のみ） |
| POST | `/api/slots/:slotId/reservations` | student | 予約。埋まっていれば `409 Conflict` |
| DELETE | `/api/reservations/:id` | 本人・admin | 取り消し |
| PATCH | `/api/reservations/:id/teacher-note` | teacher・admin | 先生からの連絡 |
| PATCH | `/api/admin/days/:date` | admin | 休止・再開 |
| PATCH | `/api/admin/slots/:id` | admin | 枠の編集 |
| GET | `/api/admin/users` | admin | 利用者一覧 |
| PATCH | `/api/admin/users/:id` | admin | 役割変更 |
| (Cron) | `scheduled` | – | 4週間先までの金曜を冪等に生成 |

- フロントからは Hono RPC クライアントで呼び出す
- 入力検証は zod（`src/shared/schemas.ts`）

## 8. フォルダ構成

```
1on2-reserve/
├── src/
│   ├── worker/                  Hono（API + Cron）
│   │   ├── index.ts             エントリ（fetch / scheduled）
│   │   ├── auth.ts              better-auth 設定（ドメイン制限）
│   │   ├── middleware/          requireAuth / requireRole
│   │   ├── routes/              me.ts, days.ts, reservations.ts, admin.ts
│   │   ├── services/            予約・枠生成のロジック（テストの中心）
│   │   └── db/
│   │       ├── schema.ts
│   │       └── client.ts
│   ├── client/                  React（SPA）
│   │   ├── main.tsx
│   │   ├── routes/              calendar / day / my-reservations / admin
│   │   ├── components/
│   │   └── lib/api.ts           Hono RPC クライアント
│   └── shared/
│       ├── schedule-template.ts
│       └── schemas.ts
├── tests/                       src/ と同じ階層構造でテストを置く
├── drizzle/                     マイグレーション
├── docs/design/                 設計メモ
├── index.html
├── vite.config.ts               @cloudflare/vite-plugin で1 Worker に統合
├── drizzle.config.ts
└── wrangler.jsonc
```

- テストは `tests/` に集約、ファイル名は kebab-case（`docs/conventions/testing.md` / `naming.md`）

### 技術スタック

| 層 | 採用 | 理由 |
|---|---|---|
| フロント | Vite + React 19 + React Router + TanStack Query + Tailwind 4 | Tsumori で経験済み |
| API | Hono（フロントと同一 Worker） | CORS・2系統デプロイの手間を無くす |
| DB | Neon（PostgreSQL）+ Drizzle | 経験済み |
| 認証 | better-auth（Google OAuth） | 経験済み・役割をアプリ内で管理できる |
| デプロイ | Cloudflare Workers | 決定済み |

## 9. 実装手順

| スプリント | ゴール | 依存 |
|---|---|---|
| S0 | 雛形・CI・Workers デプロイ・Neon 接続 | – |
| S1 | Google ログイン・ドメイン制限・プロフィール登録・役割 | S0 |
| S2 | 開催日/枠モデル・金曜自動生成（Cron）・カレンダー/日別画面（閲覧） | S1 |
| S3 | 予約・取消（二重予約防止）・自分の予約一覧 | S2 |
| S4 | 先生からの連絡・管理画面 → **MVP リリース** | S3 |
| S5〜 | counter → 予約ルール → 通知 → データ移行 | MVP |

## 10. リスク

| # | リスク | 対策 |
|---|---|---|
| 1 | Workers → Neon 接続方式（HTTP ドライバはトランザクションに制限がある可能性。**不確か**） | S0 で検証。二重予約は UNIQUE 制約で防ぎトランザクションに依存しない |
| 2 | Neon のエラーに接続文字列が含まれログに漏れる（過去2回指摘） | S0 でエラーハンドラにマスク処理を入れる |
| 3 | ドメイン制限のすり抜け（`hd` はヒントのみ） | サーバー側でメールドメインを検証 |
| 4 | タイムゾーン（Workers / Cron は UTC） | 曜日・時刻判定は Asia/Tokyo で行い、`now` を注入してテストする |
| 5 | Cron の重複実行 | `date` UNIQUE + `onConflictDoNothing` で冪等化 |
| 6 | Google OAuth 同意画面の「テスト」状態での人数上限・審査（条件は**不確か**） | S1 で確認 |
| 7 | 移行期間のスプシとの二重管理 | 切替日を決め、スプシは閲覧専用にする運用ルールを作る |

## 未決事項

- `ALLOWED_EMAIL_DOMAIN` の値（先生も同じドメインか）
- 予約の取消・実施済の表現（status 列か物理削除か）→ `db-design`
- 最初の admin の作り方（シード or 環境変数）
