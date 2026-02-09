# データベース仕様書

**プロジェクト**: YOLO JAPAN LINE Bot
**データベース**: Supabase (PostgreSQL 15+)
**必須拡張**: pgvector
**最終更新**: 2026-02-05

> この仕様書のSQLを上から順に実行することで、別環境にデータベースを完全再現できます。

---

## 目次

1. [セットアップ手順](#セットアップ手順)
2. [前提条件・拡張機能](#step-0-前提条件拡張機能)
3. [テーブル定義 (DDL)](#step-1-テーブル定義)
4. [インデックス](#step-2-インデックス)
5. [トリガー](#step-3-トリガー)
6. [RLS ポリシー](#step-4-row-level-security)
7. [ビュー](#step-5-ビュー)
8. [RPC 関数](#step-6-rpc-関数)
9. [シードデータ](#step-7-シードデータ)
10. [ER 図](#er-図)
11. [環境変数](#環境変数)
12. [補足: JSONB 構造定義](#補足-jsonb-構造定義)

---

## セットアップ手順

```
1. Supabase プロジェクトを作成
2. SQL Editor で Step 0〜6 を順番に実行
3. Step 7 (シードデータ) は必要に応じて実行
4. 環境変数を .env にセット
```

---

## Step 0: 前提条件・拡張機能

```sql
-- pgvector 拡張（FAQ ベクトル検索に必要）
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Step 1: テーブル定義

### 1-1. user_status

ユーザーの基本情報・利用統計。全テーブルの親。

```sql
CREATE TABLE IF NOT EXISTS user_status (
  user_id        TEXT PRIMARY KEY,
  lang           TEXT NOT NULL DEFAULT 'ja',
  display_name   TEXT,
  picture_url    TEXT,
  rich_menu_id   TEXT,
  ai_chat_count    INTEGER NOT NULL DEFAULT 0,
  diagnosis_count  INTEGER NOT NULL DEFAULT 0,
  total_usage_count INTEGER NOT NULL DEFAULT 0,
  first_used     TIMESTAMPTZ NOT NULL,
  last_used      TIMESTAMPTZ NOT NULL,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 |
|--------|------|
| user_id | LINE ユーザーID |
| lang | 言語コード (ja/en/ko/zh/vi) |
| display_name | LINE 表示名 |
| picture_url | LINE プロフィール画像URL |
| rich_menu_id | 紐付けリッチメニューID |
| ai_chat_count | AIチャット利用回数 |
| diagnosis_count | 診断実行回数 |
| total_usage_count | 総利用回数 |
| first_used | 初回利用日時 |
| last_used | 最終利用日時 |

---

### 1-2. conversation_state

マルチターン会話の状態管理。診断・サポートフローの進捗を JSONB で保持。

```sql
CREATE TABLE IF NOT EXISTS conversation_state (
  user_id    TEXT PRIMARY KEY,
  state      JSONB NOT NULL,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 |
|--------|------|
| user_id | LINE ユーザーID |
| state | 会話状態 JSON (後述の JSONB 構造定義を参照) |

---

### 1-3. user_answers (レガシー)

質問回答の履歴。現在は diagnosis_results に移行済み。後方互換のために残存。

```sql
CREATE TABLE IF NOT EXISTS user_answers (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 1-4. diagnosis_results

お仕事診断の回答結果。

```sql
CREATE TABLE IF NOT EXISTS diagnosis_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,
  q1_living_in_japan  TEXT,
  q2_gender           TEXT,
  q3_urgency          TEXT,
  q4_prefecture       TEXT,
  q4_region           TEXT,
  q5_japanese_level   TEXT,
  q6_industry         TEXT,
  q7_work_style       TEXT,
  timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 | 値の例 |
|--------|------|--------|
| q1_living_in_japan | 日本在住か | yes / no |
| q2_gender | 性別 | male / female / other |
| q3_urgency | 仕事探しの緊急度 | now / soon / not_yet |
| q4_prefecture | 都道府県 | 東京都 |
| q4_region | 地域 | 関東 / 関西 / 九州 等 |
| q5_japanese_level | 日本語レベル | N1 / N2 / N3 / N4 / N5 / none |
| q6_industry | 希望業種 | IT / 製造 / 飲食 等 |
| q7_work_style | 勤務形態 | fulltime / parttime |

---

### 1-5. follow_events

LINE 友だち追加/ブロック(解除)イベントの記録。

```sql
CREATE TABLE IF NOT EXISTS follow_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  event_type  TEXT NOT NULL DEFAULT 'follow',
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 | 値 |
|--------|------|----|
| event_type | イベント種別 | follow / unfollow |

---

### 1-6. ai_conversation_history

AIトーク（自由会話）の履歴。ユーザーごとに1レコード、JSONB 配列で管理。

```sql
CREATE TABLE IF NOT EXISTS ai_conversation_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT UNIQUE NOT NULL,
  history     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 1-7. support_tickets

カスタマーサポートのチケット管理。

```sql
CREATE TABLE IF NOT EXISTS support_tickets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL,
  ticket_type          TEXT NOT NULL CHECK (ticket_type IN ('feedback', 'bug')),
  service              TEXT CHECK (service IN ('YOLO_HOME', 'YOLO_DISCOVER', 'YOLO_JAPAN')),
  content              TEXT NOT NULL,
  ai_summary           TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority             TEXT NOT NULL DEFAULT 'normal',
  category             TEXT,
  user_display_name    TEXT,
  user_lang            TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}',
  escalated_at         TIMESTAMPTZ,
  escalation_reason    TEXT,
  human_takeover       BOOLEAN NOT NULL DEFAULT FALSE,
  human_takeover_at    TIMESTAMPTZ,
  human_operator_name  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 | 値 |
|--------|------|----|
| ticket_type | 種別 | feedback / bug |
| service | 対象サービス | YOLO_HOME / YOLO_DISCOVER / YOLO_JAPAN |
| status | ステータス | open / in_progress / resolved |
| priority | 優先度 | normal / high / urgent |
| human_takeover | 有人対応フラグ | true / false |

---

### 1-8. support_messages

チケットに紐づくメッセージスレッド。

```sql
CREATE TABLE IF NOT EXISTS support_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'operator')),
  content      TEXT NOT NULL,
  sender_name  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 | 値 |
|--------|------|----|
| role | 送信者種別 | user / assistant / system / operator |
| sender_name | オペレーター名 (role=operator 時) | |

---

### 1-9. known_issues

既知の不具合・障害情報。

```sql
CREATE TABLE IF NOT EXISTS known_issues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service      TEXT NOT NULL CHECK (service IN ('YOLO_HOME', 'YOLO_DISCOVER', 'YOLO_JAPAN')),
  title        TEXT NOT NULL,
  description  TEXT,
  keywords     TEXT[],
  status       TEXT NOT NULL DEFAULT 'investigating'
               CHECK (status IN ('investigating', 'resolved', 'wontfix')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);
```

---

### 1-10. tracking_tokens

LINE Bot からサイト遷移 → コンバージョンのトラッキング。

```sql
CREATE TABLE IF NOT EXISTS tracking_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT UNIQUE NOT NULL,
  user_id         TEXT NOT NULL,
  url_type        TEXT,
  destination_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ
);
```

| カラム | 説明 | 値の例 |
|--------|------|--------|
| url_type | URL種別 | faq_withdraw / job_search / faq_video |
| destination_url | 遷移先URL | https://www.yolo-japan.com/... |
| clicked_at | クリック日時 | URLクリック時に記録 |
| converted_at | CV日時 | complete_work 発火時に記録 |

---

### 1-11. application_logs

ユーザーの応募履歴（複数回応募対応）。

```sql
CREATE TABLE IF NOT EXISTS application_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  token         TEXT NOT NULL,
  url_type      TEXT,
  utm_campaign  TEXT,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 | 値の例 |
|--------|------|--------|
| utm_campaign | UTMキャンペーン | line_bot_job_search_abc123 |

---

### 1-12. application_reminders

応募リマインダーの送信履歴。同一ユーザー・同一タイプは1回のみ。

```sql
CREATE TABLE IF NOT EXISTS application_reminders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  reminder_type   TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_sent    TEXT,
  UNIQUE(user_id, reminder_type)
);
```

| カラム | 説明 | 値 |
|--------|------|----|
| reminder_type | リマインダー種別 | 3day_reminder / 7day_reminder |

---

### 1-13. faqs

FAQ マスタ。サービスごとに FAQ を管理。

```sql
CREATE TABLE IF NOT EXISTS faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service     VARCHAR(20) NOT NULL,
  faq_key     VARCHAR(100) NOT NULL,
  keywords    TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  priority    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 | 値の例 |
|--------|------|--------|
| service | 対象サービス | YOLO_HOME / YOLO_DISCOVER / YOLO_JAPAN |
| faq_key | 一意キー (英数字+_) | withdrawal / login_issue |
| keywords | 検索キーワード配列 | {退会, 解約, withdraw} |
| is_active | 論理削除フラグ | true / false |
| priority | 優先度（大きいほど優先） | 100 |

---

### 1-14. faq_translations

FAQ の多言語翻訳 + ベクトル埋め込み。

```sql
CREATE TABLE IF NOT EXISTS faq_translations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id      UUID NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
  lang        VARCHAR(10) NOT NULL,
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 |
|--------|------|
| lang | 言語コード (ja/en/ko/zh/vi) |
| embedding | OpenAI text-embedding-ada-002 (1536次元) |

---

### 1-15. faq_usage_logs

FAQ 利用ログ。統計・改善分析に使用。

```sql
CREATE TABLE IF NOT EXISTS faq_usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id        UUID NOT NULL REFERENCES faqs(id) ON DELETE CASCADE,
  user_id       TEXT,
  service       VARCHAR(20),
  user_message  TEXT,
  confidence    FLOAT,
  resolved      BOOLEAN,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| カラム | 説明 |
|--------|------|
| user_message | ユーザーの元メッセージ |
| confidence | マッチング信頼度 (0.0〜1.0) |
| resolved | FAQ で解決できたか |

---

## Step 2: インデックス

```sql
-- diagnosis_results
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_user_id
  ON diagnosis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_results_timestamp
  ON diagnosis_results(timestamp DESC);

-- follow_events
CREATE INDEX IF NOT EXISTS idx_follow_events_user_id
  ON follow_events(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_events_timestamp
  ON follow_events(timestamp DESC);

-- ai_conversation_history
CREATE INDEX IF NOT EXISTS idx_ai_conversation_history_user_id
  ON ai_conversation_history(user_id);

-- support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at
  ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_type
  ON support_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_escalated
  ON support_tickets(escalated_at) WHERE escalated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority
  ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category
  ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_human_takeover
  ON support_tickets(human_takeover) WHERE human_takeover = TRUE;

-- support_messages
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
  ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created
  ON support_messages(created_at DESC);

-- known_issues
CREATE INDEX IF NOT EXISTS idx_known_issues_service
  ON known_issues(service);
CREATE INDEX IF NOT EXISTS idx_known_issues_status
  ON known_issues(status);
CREATE INDEX IF NOT EXISTS idx_known_issues_keywords
  ON known_issues USING GIN(keywords);

-- tracking_tokens
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_token
  ON tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_user_id
  ON tracking_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_converted
  ON tracking_tokens(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_created
  ON tracking_tokens(created_at DESC);

-- application_logs
CREATE INDEX IF NOT EXISTS idx_application_logs_user_id
  ON application_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_applied_at
  ON application_logs(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_token
  ON application_logs(token);

-- application_reminders
CREATE INDEX IF NOT EXISTS idx_application_reminders_user_id
  ON application_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_application_reminders_sent_at
  ON application_reminders(sent_at);

-- faqs
CREATE INDEX IF NOT EXISTS idx_faqs_service
  ON faqs(service);
CREATE INDEX IF NOT EXISTS idx_faqs_faq_key
  ON faqs(faq_key);
CREATE INDEX IF NOT EXISTS idx_faqs_is_active
  ON faqs(is_active);

-- faq_translations
CREATE INDEX IF NOT EXISTS idx_faq_translations_faq_id
  ON faq_translations(faq_id);
CREATE INDEX IF NOT EXISTS idx_faq_translations_lang
  ON faq_translations(lang);

-- faq_usage_logs
CREATE INDEX IF NOT EXISTS idx_faq_usage_logs_faq_id
  ON faq_usage_logs(faq_id);
CREATE INDEX IF NOT EXISTS idx_faq_usage_logs_created_at
  ON faq_usage_logs(created_at DESC);
```

---

## Step 3: トリガー

```sql
-- updated_at 自動更新用の汎用関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- support_tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ai_conversation_history
CREATE TRIGGER update_ai_conversation_history_updated_at
  BEFORE UPDATE ON ai_conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- faqs
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- faq_translations
CREATE TRIGGER update_faq_translations_updated_at
  BEFORE UPDATE ON faq_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 4: Row Level Security

```sql
-- 全テーブルで RLS を有効化
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_usage_logs ENABLE ROW LEVEL SECURITY;

-- Service Role: 全テーブルにフルアクセス
-- (Supabase の service_role キーで接続する場合)
CREATE POLICY "service_role_all" ON user_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON conversation_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON user_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON diagnosis_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON follow_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ai_conversation_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON support_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON known_issues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON tracking_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON application_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON application_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON faqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON faq_translations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON faq_usage_logs FOR ALL USING (true) WITH CHECK (true);

-- Anonymous: known_issues のみ読み取り可
CREATE POLICY "anon_read_known_issues" ON known_issues FOR SELECT USING (true);
```

---

## Step 5: ビュー

```sql
-- コンバージョン済みユーザー集約
CREATE OR REPLACE VIEW converted_users AS
SELECT
  user_id,
  MIN(converted_at) AS first_conversion,
  MAX(converted_at) AS last_conversion,
  COUNT(*) AS conversion_count,
  array_agg(DISTINCT url_type) AS url_types
FROM tracking_tokens
WHERE converted_at IS NOT NULL
GROUP BY user_id;

-- 月別統計
CREATE OR REPLACE VIEW monthly_stats AS
SELECT
  DATE_TRUNC('month', first_used)::DATE AS month,
  COUNT(*) AS new_users,
  COALESCE(SUM(ai_chat_count), 0) AS total_ai_chats,
  COALESCE(SUM(diagnosis_count), 0) AS total_diagnosis
FROM user_status
GROUP BY DATE_TRUNC('month', first_used)
ORDER BY month DESC;

-- 日別診断統計
CREATE OR REPLACE VIEW daily_diagnosis_stats AS
SELECT
  DATE(timestamp) AS date,
  COUNT(*) AS count,
  COUNT(DISTINCT user_id) AS unique_users
FROM diagnosis_results
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

## Step 6: RPC 関数

### 6-1. ダッシュボード統計

```sql
-- 全統計を1クエリで取得
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM user_status),
    'total_ai_chats', (SELECT COALESCE(SUM(ai_chat_count), 0) FROM user_status),
    'total_diagnosis', (SELECT COUNT(*) FROM diagnosis_results),
    'diagnosis_user_count', (SELECT COUNT(*) FROM user_status WHERE diagnosis_count >= 1),
    'today_active_users', (SELECT COUNT(*) FROM user_status WHERE last_used >= CURRENT_DATE),
    'repeat_user_count', (SELECT COUNT(*) FROM user_status WHERE diagnosis_count >= 2)
  );
$$ LANGUAGE SQL STABLE;

-- 月別統計
CREATE OR REPLACE FUNCTION get_dashboard_stats_by_month(start_date DATE, end_date DATE)
RETURNS JSON AS $$
  WITH period_diagnosis AS (
    SELECT user_id, COUNT(*) AS cnt
    FROM diagnosis_results
    WHERE timestamp >= start_date
      AND timestamp <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    GROUP BY user_id
  )
  SELECT json_build_object(
    'new_users', (
      SELECT COUNT(*) FROM user_status
      WHERE first_used >= start_date
        AND first_used <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    ),
    'total_users', (SELECT COUNT(*) FROM user_status),
    'total_diagnosis', (
      SELECT COUNT(*) FROM diagnosis_results
      WHERE timestamp >= start_date
        AND timestamp <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    ),
    'diagnosis_user_count', (SELECT COUNT(*) FROM period_diagnosis),
    'active_users', (
      SELECT COUNT(*) FROM user_status
      WHERE last_used >= start_date
        AND last_used <= end_date + INTERVAL '1 day' - INTERVAL '1 second'
    ),
    'repeat_user_count', (SELECT COUNT(*) FROM period_diagnosis WHERE cnt >= 2)
  );
$$ LANGUAGE SQL STABLE;
```

### 6-2. カウンター操作

```sql
CREATE OR REPLACE FUNCTION increment_ai_chat_count(p_user_id TEXT)
RETURNS VOID AS $$
  UPDATE user_status
  SET ai_chat_count = ai_chat_count + 1,
      total_usage_count = total_usage_count + 1,
      last_used = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL VOLATILE;

CREATE OR REPLACE FUNCTION increment_diagnosis_count(p_user_id TEXT)
RETURNS VOID AS $$
  UPDATE user_status
  SET diagnosis_count = diagnosis_count + 1,
      total_usage_count = total_usage_count + 1,
      last_used = NOW()
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL VOLATILE;
```

### 6-3. 分布取得

```sql
CREATE OR REPLACE FUNCTION get_language_distribution()
RETURNS TABLE(lang TEXT, count BIGINT) AS $$
  SELECT COALESCE(us.lang, 'unknown')::TEXT, COUNT(*)
  FROM user_status us
  GROUP BY us.lang
  ORDER BY COUNT(*) DESC;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_japanese_level_distribution()
RETURNS TABLE(level TEXT, count BIGINT) AS $$
  SELECT COALESCE(q5_japanese_level, 'unknown')::TEXT, COUNT(*)
  FROM diagnosis_results
  WHERE q5_japanese_level IS NOT NULL
  GROUP BY q5_japanese_level
  ORDER BY COUNT(*) DESC;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_region_distribution()
RETURNS TABLE(region TEXT, count BIGINT) AS $$
  SELECT COALESCE(q4_region, 'unknown')::TEXT, COUNT(*)
  FROM diagnosis_results
  WHERE q4_region IS NOT NULL
  GROUP BY q4_region
  ORDER BY COUNT(*) DESC;
$$ LANGUAGE SQL STABLE;
```

### 6-4. トレンド取得

```sql
CREATE OR REPLACE FUNCTION get_daily_user_trend(days_back INT DEFAULT 30)
RETURNS TABLE(date DATE, count BIGINT) AS $$
  SELECT DATE(first_used), COUNT(*)
  FROM user_status
  WHERE first_used >= CURRENT_DATE - days_back
  GROUP BY DATE(first_used)
  ORDER BY DATE(first_used);
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_daily_diagnosis_trend(days_back INT DEFAULT 30)
RETURNS TABLE(date DATE, count BIGINT) AS $$
  SELECT DATE(timestamp), COUNT(*)
  FROM diagnosis_results
  WHERE timestamp >= CURRENT_DATE - days_back
  GROUP BY DATE(timestamp)
  ORDER BY DATE(timestamp);
$$ LANGUAGE SQL STABLE;
```

### 6-5. サポート系

```sql
-- 既知問題検索
CREATE OR REPLACE FUNCTION search_known_issues(
  p_service TEXT DEFAULT NULL,
  p_keyword TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, service TEXT, title TEXT, description TEXT, status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT ki.id, ki.service, ki.title, ki.description, ki.status
  FROM known_issues ki
  WHERE ki.status != 'resolved'
    AND (p_service IS NULL OR ki.service = p_service)
    AND (p_keyword IS NULL OR
         ki.title ILIKE '%' || p_keyword || '%' OR
         ki.description ILIKE '%' || p_keyword || '%' OR
         p_keyword = ANY(ki.keywords));
END;
$$ LANGUAGE plpgsql STABLE;

-- チケット作成
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_user_id TEXT,
  p_ticket_type TEXT,
  p_service TEXT DEFAULT NULL,
  p_content TEXT DEFAULT '',
  p_ai_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ticket_id UUID;
BEGIN
  INSERT INTO support_tickets (user_id, ticket_type, service, content, ai_summary)
  VALUES (p_user_id, p_ticket_type, p_service, p_content, p_ai_summary)
  RETURNING id INTO v_ticket_id;
  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- サポート統計
CREATE OR REPLACE FUNCTION get_support_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_tickets', (SELECT COUNT(*) FROM support_tickets),
    'open_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'feedback_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'feedback'),
    'bug_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'bug'),
    'today_tickets', (SELECT COUNT(*) FROM support_tickets WHERE created_at >= CURRENT_DATE),
    'known_issues_count', (SELECT COUNT(*) FROM known_issues WHERE status = 'investigating')
  );
$$ LANGUAGE SQL STABLE;

-- サポート統計（拡張版）
CREATE OR REPLACE FUNCTION get_support_stats_extended()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_tickets', (SELECT COUNT(*) FROM support_tickets),
    'open_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'in_progress_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'in_progress'),
    'resolved_tickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'resolved'),
    'escalated_tickets', (SELECT COUNT(*) FROM support_tickets WHERE escalated_at IS NOT NULL),
    'human_takeover_active', (SELECT COUNT(*) FROM support_tickets WHERE human_takeover = TRUE),
    'today_tickets', (SELECT COUNT(*) FROM support_tickets WHERE created_at >= CURRENT_DATE),
    'feedback_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'feedback'),
    'bug_count', (SELECT COUNT(*) FROM support_tickets WHERE ticket_type = 'bug'),
    'by_service', (
      SELECT json_object_agg(COALESCE(service, 'unknown'), cnt)
      FROM (SELECT service, COUNT(*) AS cnt FROM support_tickets GROUP BY service) s
    ),
    'by_category', (
      SELECT json_object_agg(COALESCE(category, 'uncategorized'), cnt)
      FROM (SELECT category, COUNT(*) AS cnt FROM support_tickets GROUP BY category) c
    )
  );
$$ LANGUAGE SQL STABLE;

-- メッセージ保存
CREATE OR REPLACE FUNCTION save_support_message(
  p_ticket_id UUID,
  p_role TEXT,
  p_content TEXT,
  p_sender_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  INSERT INTO support_messages (ticket_id, role, content, sender_name)
  VALUES (p_ticket_id, p_role, p_content, p_sender_name)
  RETURNING id INTO v_message_id;
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- チケットメッセージ取得
CREATE OR REPLACE FUNCTION get_ticket_messages(p_ticket_id UUID)
RETURNS TABLE(id UUID, role TEXT, content TEXT, sender_name TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT sm.id, sm.role, sm.content, sm.sender_name, sm.created_at
  FROM support_messages sm
  WHERE sm.ticket_id = p_ticket_id
  ORDER BY sm.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 有人対応切替
CREATE OR REPLACE FUNCTION toggle_human_takeover(
  p_ticket_id UUID,
  p_enable BOOLEAN,
  p_operator_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE support_tickets
  SET human_takeover = p_enable,
      human_takeover_at = CASE WHEN p_enable THEN NOW() ELSE NULL END,
      human_operator_name = CASE WHEN p_enable THEN p_operator_name ELSE NULL END,
      status = CASE WHEN p_enable THEN 'in_progress' ELSE status END,
      updated_at = NOW()
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- アクティブチケット取得
CREATE OR REPLACE FUNCTION get_active_ticket_by_user(p_user_id TEXT)
RETURNS TABLE(
  id UUID, user_id TEXT, ticket_type TEXT, service TEXT,
  status TEXT, human_takeover BOOLEAN, human_operator_name TEXT, created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT st.id, st.user_id, st.ticket_type, st.service, st.status,
         st.human_takeover, st.human_operator_name, st.created_at
  FROM support_tickets st
  WHERE st.user_id = p_user_id AND st.status IN ('open', 'in_progress')
  ORDER BY st.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- エスカレーション
CREATE OR REPLACE FUNCTION escalate_ticket(
  p_ticket_id UUID,
  p_reason TEXT,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS VOID AS $$
BEGIN
  UPDATE support_tickets
  SET escalated_at = NOW(),
      escalation_reason = p_reason,
      priority = p_priority,
      updated_at = NOW()
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql VOLATILE;
```

### 6-6. コンバージョン統計

```sql
CREATE OR REPLACE FUNCTION get_conversion_stats(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  filter_start TIMESTAMPTZ;
  filter_end TIMESTAMPTZ;
BEGIN
  filter_start := COALESCE(start_date, '1970-01-01'::TIMESTAMPTZ);
  filter_end := COALESCE(end_date, NOW() + INTERVAL '1 day');

  SELECT json_build_object(
    'total_tokens', (
      SELECT COUNT(*) FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    ),
    'unique_issued_users', (
      SELECT COUNT(DISTINCT user_id) FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    ),
    'total_clicks', (
      SELECT COUNT(*) FROM tracking_tokens
      WHERE clicked_at IS NOT NULL
        AND clicked_at >= filter_start AND clicked_at < filter_end
    ),
    'unique_clicked_users', (
      SELECT COUNT(DISTINCT user_id) FROM tracking_tokens
      WHERE clicked_at IS NOT NULL
        AND clicked_at >= filter_start AND clicked_at < filter_end
    ),
    'total_conversions', (
      SELECT COUNT(*) FROM application_logs
      WHERE applied_at >= filter_start AND applied_at < filter_end
    ),
    'unique_converted_users', (
      SELECT COUNT(DISTINCT user_id) FROM application_logs
      WHERE applied_at >= filter_start AND applied_at < filter_end
    ),
    'click_rate', (
      SELECT CASE WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric / COUNT(*) * 100, 2)
      END
      FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    ),
    'conversion_rate', (
      SELECT CASE WHEN COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) = 0 THEN 0
        ELSE ROUND(
          (SELECT COUNT(*) FROM application_logs WHERE applied_at >= filter_start AND applied_at < filter_end)::numeric
          / COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) * 100, 2
        )
      END
      FROM tracking_tokens
      WHERE created_at >= filter_start AND created_at < filter_end
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_daily_conversions(days_back INTEGER DEFAULT 30)
RETURNS TABLE(date DATE, conversions BIGINT, clicks BIGINT, tokens_created BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date::DATE,
    COUNT(*) FILTER (WHERE t.converted_at::DATE = d.date) AS conversions,
    COUNT(*) FILTER (WHERE t.clicked_at::DATE = d.date) AS clicks,
    COUNT(*) FILTER (WHERE t.created_at::DATE = d.date) AS tokens_created
  FROM generate_series(CURRENT_DATE - days_back, CURRENT_DATE, '1 day'::interval) AS d(date)
  LEFT JOIN tracking_tokens t ON TRUE
  GROUP BY d.date
  ORDER BY d.date DESC;
END;
$$ LANGUAGE plpgsql;
```

### 6-7. FAQ 系

```sql
-- ベクトル類似検索
CREATE OR REPLACE FUNCTION search_faqs_by_vector(
  query_embedding vector(1536),
  p_service VARCHAR(20) DEFAULT NULL,
  p_lang VARCHAR(10) DEFAULT 'ja',
  p_limit INT DEFAULT 5,
  p_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE(
  id UUID, service VARCHAR(20), faq_key VARCHAR(100),
  keywords TEXT[], priority INT, question TEXT, answer TEXT, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.service, f.faq_key, f.keywords, f.priority,
         ft.question, ft.answer,
         1 - (ft.embedding <=> query_embedding) AS similarity
  FROM faqs f
  JOIN faq_translations ft ON f.id = ft.faq_id
  WHERE f.is_active = true
    AND ft.lang = p_lang
    AND ft.embedding IS NOT NULL
    AND (p_service IS NULL OR f.service = p_service)
    AND 1 - (ft.embedding <=> query_embedding) >= p_threshold
  ORDER BY ft.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$;

-- FAQ 利用統計
CREATE OR REPLACE FUNCTION get_faq_stats(
  p_service VARCHAR(20) DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE(
  faq_id UUID, faq_key VARCHAR(100), service VARCHAR(20),
  question TEXT, usage_count BIGINT, resolved_count BIGINT, resolve_rate FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.faq_key, f.service, ft.question,
         COUNT(l.id)::BIGINT AS usage_count,
         COUNT(CASE WHEN l.resolved = true THEN 1 END)::BIGINT AS resolved_count,
         CASE WHEN COUNT(l.id) > 0
           THEN COUNT(CASE WHEN l.resolved = true THEN 1 END)::FLOAT / COUNT(l.id)::FLOAT
           ELSE 0
         END AS resolve_rate
  FROM faqs f
  JOIN faq_translations ft ON f.id = ft.faq_id AND ft.lang = 'ja'
  LEFT JOIN faq_usage_logs l ON f.id = l.faq_id AND l.created_at >= p_start_date
  WHERE f.is_active = true
    AND (p_service IS NULL OR f.service = p_service)
  GROUP BY f.id, f.faq_key, f.service, ft.question
  ORDER BY usage_count DESC;
END;
$$;

-- FAQ 一括登録ヘルパー
CREATE OR REPLACE FUNCTION migrate_faq(
  p_service VARCHAR(20),
  p_faq_key VARCHAR(100),
  p_keywords TEXT[],
  p_priority INT,
  p_question_ja TEXT,
  p_answer_ja TEXT
)
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_faq_id UUID;
BEGIN
  INSERT INTO faqs (service, faq_key, keywords, priority)
  VALUES (p_service, p_faq_key, p_keywords, p_priority)
  RETURNING id INTO v_faq_id;

  INSERT INTO faq_translations (faq_id, lang, question, answer)
  VALUES (v_faq_id, 'ja', p_question_ja, p_answer_ja);

  RETURN v_faq_id;
END;
$$;
```

---

## Step 7: シードデータ

> FAQ の初期データ。別サービスで使う場合は内容を書き換えてください。
> 完全なシードデータは `supabase/migrations/003_faq_seed_data.sql` を参照。

```sql
-- 例: FAQ 登録
SELECT migrate_faq(
  'YOLO_JAPAN',
  'yolo_japan_apply',
  ARRAY['応募', '求人', 'apply', 'job', '登録'],
  100,
  '求人に応募するには？',
  '【登録済みの方】マイページにログインし...'
);
```

---

## ER 図

```
user_status (user_id PK)
  |
  |-- 1:1 -- conversation_state (user_id PK)
  |-- 1:N -- diagnosis_results (user_id)
  |-- 1:N -- follow_events (user_id)
  |-- 1:1 -- ai_conversation_history (user_id UNIQUE)
  |-- 1:N -- support_tickets (user_id)
  |             |-- 1:N -- support_messages (ticket_id FK)
  |-- 1:N -- tracking_tokens (user_id)
  |-- 1:N -- application_logs (user_id)
  |-- 1:N -- application_reminders (user_id + reminder_type UNIQUE)
  |
  +-- (user_id は FK 制約なし。LINE user_id で論理的に結合)

faqs (id PK)
  |-- 1:N -- faq_translations (faq_id FK CASCADE)
  |-- 1:N -- faq_usage_logs (faq_id FK CASCADE)

known_issues (id PK)  -- 独立テーブル
```

---

## 環境変数

アプリケーションが必要とする Supabase 関連の環境変数:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (FAQ ベクトル埋め込み + AI エスカレーション判定)
OPENAI_API_KEY=sk-...

# LINE Messaging API
LINE_CHANNEL_SECRET=xxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxx
```

---

## 補足: JSONB 構造定義

### conversation_state.state

```typescript
interface ConversationState {
  mode: 'diagnosis' | 'ai_chat' | 'support' | 'idle';
  step?: string;                    // 診断の現在ステップ
  answers?: {                       // 診断回答
    living_in_japan?: string;
    gender?: string;
    urgency?: string;
    prefecture?: string;
    region?: string;
    japanese_level?: string;
    industry?: string;
    work_style?: string;
  };
  supportMode?: {                   // サポートモード状態
    step: string;
    service?: 'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN';
    category?: string;
    ticketId?: string;
    messages?: Array<{ role: string; content: string }>;
  };
}
```

### ai_conversation_history.history

```typescript
type History = Array<{
  role: 'user' | 'assistant';
  content: string;
}>;
```

### support_tickets.metadata

```typescript
interface TicketMetadata {
  [key: string]: any;               // 拡張用メタデータ
}
```

---

## 対応サービス・言語

```typescript
type ServiceType = 'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN';

const SUPPORTED_LANGS = ['ja', 'en', 'ko', 'zh', 'vi'];
```

| コード | 言語 |
|--------|------|
| ja | 日本語 |
| en | English |
| ko | 한국어 |
| zh | 中文 |
| vi | Tiếng Việt |
