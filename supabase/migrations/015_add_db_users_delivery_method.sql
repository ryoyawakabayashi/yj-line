-- delivery_method に db_users を追加
ALTER TABLE broadcast_campaigns DROP CONSTRAINT IF EXISTS broadcast_campaigns_delivery_method_check;
ALTER TABLE broadcast_campaigns ADD CONSTRAINT broadcast_campaigns_delivery_method_check
  CHECK (delivery_method IN ('broadcast', 'narrowcast', 'test', 'prefecture', 'recent_followers', 'db_users'));
