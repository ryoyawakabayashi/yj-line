#!/bin/bash

echo "古い環境変数を削除中..."
npx vercel env rm RICHMENU_JA production -y 2>/dev/null
npx vercel env rm RICHMENU_EN production -y 2>/dev/null
npx vercel env rm RICHMENU_KO production -y 2>/dev/null
npx vercel env rm RICHMENU_ZH production -y 2>/dev/null
npx vercel env rm RICHMENU_VI production -y 2>/dev/null

echo ""
echo "新しい環境変数を追加中..."

echo "richmenu-373fab7f4f8adbd4841c93cc2d27c47f" | npx vercel env add RICHMENU_JA production
echo "richmenu-a1ef9ac139563e776942a28d41d7acc4" | npx vercel env add RICHMENU_EN production
echo "richmenu-d7ab9bc99dda7eebd5b14e106347497e" | npx vercel env add RICHMENU_KO production
echo "richmenu-600002ef4f42e96fd82cadd683e1fd7e" | npx vercel env add RICHMENU_ZH production
echo "richmenu-99221d445d3ac19f0ead8425afaa38cf" | npx vercel env add RICHMENU_VI production

echo "✅ 全ての環境変数を更新しました"
