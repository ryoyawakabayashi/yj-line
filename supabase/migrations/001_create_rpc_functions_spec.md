# Supabase RPC Functions 仕様書

## 概要

LINE Bot ダッシュボードのパフォーマンス最適化のために作成されたPostgreSQL関数群。
複数のクエリを1回のRPC呼び出しに集約し、データベースアクセスを効率化する。

---

## 関数一覧

| No | 関数名 | 用途 | 最適化効果 |
|----|--------|------|-----------|
| 1 | `get_dashboard_stats` | ダッシュボード全体統計 | 6クエリ → 1クエリ |
| 2 | `increment_ai_chat_count` | AIチャット回数増加 | 2クエリ → 1クエリ |
| 3 | `increment_diagnosis_count` | 診断回数増加 | 2クエリ → 1クエリ |
| 4 | `get_language_distribution` | 言語別ユーザー分布 | JS集計 → DB集計 |
| 5 | `get_japanese_level_distribution` | 日本語レベル別分布 | JS集計 → DB集計 |
| 6 | `get_region_distribution` | 地域別分布 | JS集計 → DB集計 |
| 7 | `get_daily_user_trend` | 日別ユーザー登録推移 | JS集計 → DB集計 |
| 8 | `get_daily_diagnosis_trend` | 日別診断数推移 | JS集計 → DB集計 |
| 9 | `get_dashboard_stats_by_month` | 月別統計 | 6クエリ → 1クエリ |

---

## 関数詳細

### 1. get_dashboard_stats

**目的**: ダッシュボードのメイン統計情報を一括取得

**パラメータ**: なし

**戻り値**: JSON
```json
{
  "total_users": 123,
  "total_ai_chats": 456,
  "total_diagnosis": 78,
  "diagnosis_user_count": 45,
  "today_active_users": 12,
  "repeat_user_count": 23
}
```

**取得データ**:
| キー | 説明 | 取得元 |
|------|------|--------|
| `total_users` | 総ユーザー数 | `user_status` の全件数 |
| `total_ai_chats` | AI相談総回数 | `user_status.ai_chat_count` の合計 |
| `total_diagnosis` | 診断実施総数 | `diagnosis_results` の全件数 |
| `diagnosis_user_count` | 診断実施ユーザー数 | `diagnosis_count >= 1` のユーザー数 |
| `today_active_users` | 本日アクティブユーザー数 | `last_used >= 今日` のユーザー数 |
| `repeat_user_count` | リピートユーザー数 | `diagnosis_count >= 2` のユーザー数 |

**呼び出し例**:
```typescript
const { data } = await supabase.rpc('get_dashboard_stats');
```

---

### 2. increment_ai_chat_count

**目的**: AIチャット利用時にカウントを1増加

**パラメータ**:
| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `p_user_id` | TEXT | Yes | LINEユーザーID |

**戻り値**: なし（VOID）

**更新内容**:
- `ai_chat_count` を +1
- `total_usage_count` を +1
- `last_used` を現在時刻に更新

**呼び出し例**:
```typescript
await supabase.rpc('increment_ai_chat_count', { p_user_id: 'U1234567890' });
```

---

### 3. increment_diagnosis_count

**目的**: 診断完了時にカウントを1増加

**パラメータ**:
| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `p_user_id` | TEXT | Yes | LINEユーザーID |

**戻り値**: なし（VOID）

**更新内容**:
- `diagnosis_count` を +1
- `total_usage_count` を +1
- `last_used` を現在時刻に更新

**呼び出し例**:
```typescript
await supabase.rpc('increment_diagnosis_count', { p_user_id: 'U1234567890' });
```

---

### 4. get_language_distribution

**目的**: ユーザーの言語設定別の分布を取得

**パラメータ**: なし

**戻り値**: TABLE
| カラム | 型 | 説明 |
|--------|-----|------|
| `lang` | TEXT | 言語コード（ja, en, ko, zh, vi, unknown） |
| `count` | BIGINT | ユーザー数 |

**ソート**: 件数の多い順（降順）

**呼び出し例**:
```typescript
const { data } = await supabase.rpc('get_language_distribution');
// => [{ lang: 'ja', count: 100 }, { lang: 'en', count: 50 }, ...]
```

---

### 5. get_japanese_level_distribution

**目的**: 診断で回答された日本語レベル別の分布を取得

**パラメータ**: なし

**戻り値**: TABLE
| カラム | 型 | 説明 |
|--------|-----|------|
| `level` | TEXT | 日本語レベル |
| `count` | BIGINT | 回答数 |

**データソース**: `diagnosis_results.q5_japanese_level`

**ソート**: 件数の多い順（降順）

**呼び出し例**:
```typescript
const { data } = await supabase.rpc('get_japanese_level_distribution');
// => [{ level: 'N2', count: 45 }, { level: 'N3', count: 30 }, ...]
```

---

### 6. get_region_distribution

**目的**: 診断で回答された地域別の分布を取得

**パラメータ**: なし

**戻り値**: TABLE
| カラム | 型 | 説明 |
|--------|-----|------|
| `region` | TEXT | 地域名 |
| `count` | BIGINT | 回答数 |

**データソース**: `diagnosis_results.q4_region`

**ソート**: 件数の多い順（降順）

**呼び出し例**:
```typescript
const { data } = await supabase.rpc('get_region_distribution');
// => [{ region: 'kanto', count: 80 }, { region: 'kansai', count: 40 }, ...]
```

---

### 7. get_daily_user_trend

**目的**: 日別の新規ユーザー登録数推移を取得

**パラメータ**:
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| `days_back` | INT | No | 30 | 過去何日分を取得するか |

**戻り値**: TABLE
| カラム | 型 | 説明 |
|--------|-----|------|
| `date` | DATE | 日付 |
| `count` | BIGINT | 新規登録ユーザー数 |

**データソース**: `user_status.first_used`

**ソート**: 日付の古い順（昇順）

**呼び出し例**:
```typescript
// 過去30日分
const { data } = await supabase.rpc('get_daily_user_trend', { days_back: 30 });

// 過去7日分
const { data } = await supabase.rpc('get_daily_user_trend', { days_back: 7 });
```

---

### 8. get_daily_diagnosis_trend

**目的**: 日別の診断実施数推移を取得

**パラメータ**:
| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|-----|------|-----------|------|
| `days_back` | INT | No | 30 | 過去何日分を取得するか |

**戻り値**: TABLE
| カラム | 型 | 説明 |
|--------|-----|------|
| `date` | DATE | 日付 |
| `count` | BIGINT | 診断実施数 |

**データソース**: `diagnosis_results.timestamp`

**ソート**: 日付の古い順（昇順）

**呼び出し例**:
```typescript
const { data } = await supabase.rpc('get_daily_diagnosis_trend', { days_back: 30 });
```

---

### 9. get_dashboard_stats_by_month

**目的**: 指定期間のダッシュボード統計を取得

**パラメータ**:
| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `start_date` | DATE | Yes | 期間開始日（例: '2024-12-01'） |
| `end_date` | DATE | Yes | 期間終了日（例: '2024-12-31'） |

**戻り値**: JSON
```json
{
  "new_users": 50,
  "total_users": 500,
  "total_diagnosis": 120,
  "diagnosis_user_count": 80,
  "active_users": 200,
  "repeat_user_count": 15
}
```

**取得データ**:
| キー | 説明 |
|------|------|
| `new_users` | 期間内の新規ユーザー数 |
| `total_users` | 累計ユーザー数 |
| `total_diagnosis` | 期間内の診断実施数 |
| `diagnosis_user_count` | 期間内に診断したユニークユーザー数 |
| `active_users` | 期間内のアクティブユーザー数 |
| `repeat_user_count` | 期間内に2回以上診断したユーザー数 |

**呼び出し例**:
```typescript
const { data } = await supabase.rpc('get_dashboard_stats_by_month', {
  start_date: '2024-12-01',
  end_date: '2024-12-31'
});
```

---

## ビュー一覧

### monthly_stats

**目的**: 月別の統計サマリーを提供

**カラム**:
| カラム | 型 | 説明 |
|--------|-----|------|
| `month` | DATE | 月（月初日） |
| `new_users` | BIGINT | 新規ユーザー数 |
| `total_ai_chats` | BIGINT | AI相談回数合計 |
| `total_diagnosis` | BIGINT | 診断回数合計 |

**ソート**: 新しい月順（降順）

**使用例**:
```sql
SELECT * FROM monthly_stats LIMIT 12;
```

---

### daily_diagnosis_stats

**目的**: 日別の診断統計を提供

**カラム**:
| カラム | 型 | 説明 |
|--------|-----|------|
| `date` | DATE | 日付 |
| `count` | BIGINT | 診断実施数 |
| `unique_users` | BIGINT | ユニークユーザー数 |

**ソート**: 新しい日付順（降順）

**使用例**:
```sql
SELECT * FROM daily_diagnosis_stats WHERE date >= CURRENT_DATE - 7;
```

---

## 関数の特性

### STABLE vs VOLATILE

| 特性 | 説明 | 該当関数 |
|------|------|----------|
| `STABLE` | 同一トランザクション内で同じ結果を返す（読み取り専用） | get_* 系すべて |
| `VOLATILE` | 呼び出しごとに結果が変わる可能性がある（更新系） | increment_* 系 |

---

## 依存テーブル

### user_status
| カラム | 使用関数 |
|--------|----------|
| `user_id` | increment_* |
| `lang` | get_language_distribution |
| `ai_chat_count` | get_dashboard_stats, increment_ai_chat_count |
| `diagnosis_count` | get_dashboard_stats, increment_diagnosis_count |
| `total_usage_count` | increment_* |
| `first_used` | get_daily_user_trend, get_dashboard_stats_by_month |
| `last_used` | get_dashboard_stats, increment_* |

### diagnosis_results
| カラム | 使用関数 |
|--------|----------|
| `user_id` | get_dashboard_stats_by_month |
| `timestamp` | get_daily_diagnosis_trend, get_dashboard_stats_by_month |
| `q4_region` | get_region_distribution |
| `q5_japanese_level` | get_japanese_level_distribution |

---

## 実行方法

Supabase Dashboard > SQL Editor で以下のファイルを実行:
```
supabase/migrations/001_create_rpc_functions.sql
```

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-XX | 初版作成。9つのRPC関数と2つのビューを追加 |
