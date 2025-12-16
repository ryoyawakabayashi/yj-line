#!/usr/bin/env python3
import re

with open('lib/handlers/buttons.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# handleContact を修正 (83-86行目)
content = re.sub(
    r'export async function handleContact\(\s*replyToken: string,\s*userId: string\s*\): Promise<void> \{\s*const lang = await getUserLang\(userId\);',
    '''export async function handleContact(
  event: any,
  lang: string
): Promise<void> {
  const replyToken = event.replyToken;''',
    content,
    flags=re.DOTALL
)

# handleSiteMode を修正 (163-166行目)
content = re.sub(
    r'export async function handleSiteMode\(\s*userId: string,\s*replyToken: string\s*\): Promise<void> \{\s*const lang = await getUserLang\(userId\);',
    '''export async function handleSiteMode(
  event: any,
  lang: string
): Promise<void> {
  const userId = event.source.userId;
  const replyToken = event.replyToken;''',
    content,
    flags=re.DOTALL
)

# handleViewFeatures を修正 (184-187行目)
content = re.sub(
    r'export async function handleViewFeatures\(\s*userId: string,\s*replyToken: string\s*\): Promise<void> \{\s*const lang = await getUserLang\(userId\);',
    '''export async function handleViewFeatures(
  event: any,
  lang: string
): Promise<void> {
  const replyToken = event.replyToken;''',
    content,
    flags=re.DOTALL
)

with open('lib/handlers/buttons.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ buttons.ts を修正しました")
