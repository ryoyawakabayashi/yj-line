#!/bin/bash

echo "古いリッチメニュー環境変数を削除中..."
npx vercel env rm RICHMENU_INIT production -y 2>/dev/null
npx vercel env rm RICHMENU_JA production -y 2>/dev/null
npx vercel env rm RICHMENU_EN production -y 2>/dev/null
npx vercel env rm RICHMENU_KO production -y 2>/dev/null
npx vercel env rm RICHMENU_ZH production -y 2>/dev/null
npx vercel env rm RICHMENU_VI production -y 2>/dev/null

echo ""
echo "新しいリッチメニュー環境変数を追加中..."

echo "richmenu-a1ef9ac139563e776942a28d41d7acc4" | npx vercel env add RICHMENU_INIT production
echo "richmenu-afd72d43e7f854f35d42b2424ee0a663" | npx vercel env add RICHMENU_JA production
echo "richmenu-a1ef9ac139563e776942a28d41d7acc4" | npx vercel env add RICHMENU_EN production
echo "richmenu-683e241a7618e8aca838a6ff4ae955ae" | npx vercel env add RICHMENU_KO production
echo "richmenu-24ae71c3fd5feaa0a3dd1753ccdfd868" | npx vercel env add RICHMENU_ZH production
echo "richmenu-a46ce1e92ade8a3a8e70c8356c86faeb" | npx vercel env add RICHMENU_VI production

echo "✅ 全てのリッチメニュー環境変数を更新しました"
