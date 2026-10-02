# DB 規約（このプロジェクト固有）

> 判断したものだけを書く。未定のまま残してよい。

## テーブル名・カラム名

**未定**

論点の例:
- テーブル名は複数形（`reservations`）か単数形か
- カラム名は snake_case か camelCase か（Drizzle 側の TS プロパティ名との対応）

選んだ理由:

---

## 主キー

**未定**

論点の例:
- 連番（serial / identity）か UUID か

選んだ理由:

---

## 削除時の挙動

**未定**

論点の例:
- 物理削除か、status / deleted_at による論理削除か
- 外部キーの ON DELETE（cascade / restrict / set null）

選んだ理由:

---

## 日時の扱い

**未定**

論点の例:
- timestamp with time zone で UTC 保存し、表示時に Asia/Tokyo へ変換するか
- 開催日（date）と枠の時刻（time）をどう持つか

選んだ理由:
