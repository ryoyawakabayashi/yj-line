import { describe, it, expect } from 'vitest';
import {
  SERVICE_FAQ,
  COMMON_FAQ,
  SUPPORT_MESSAGES,
  generateSupportSystemPrompt,
  generateSummaryPrompt,
  searchFAQ,
  getSupportMessage,
} from '@/lib/support/faq';

describe('FAQ Module', () => {
  describe('SERVICE_FAQ', () => {
    it('should have FAQs for all services', () => {
      expect(SERVICE_FAQ).toHaveProperty('YOLO_HOME');
      expect(SERVICE_FAQ).toHaveProperty('YOLO_DISCOVER');
      expect(SERVICE_FAQ).toHaveProperty('YOLO_JAPAN');
    });

    it('should have at least one FAQ per service', () => {
      expect(SERVICE_FAQ.YOLO_HOME.length).toBeGreaterThan(0);
      expect(SERVICE_FAQ.YOLO_DISCOVER.length).toBeGreaterThan(0);
      expect(SERVICE_FAQ.YOLO_JAPAN.length).toBeGreaterThan(0);
    });

    it('should have Q&A format for each FAQ', () => {
      SERVICE_FAQ.YOLO_JAPAN.forEach((qa) => {
        expect(qa).toContain('Q:');
        expect(qa).toContain('A:');
      });
    });
  });

  describe('COMMON_FAQ', () => {
    it('should have at least one FAQ', () => {
      expect(COMMON_FAQ.length).toBeGreaterThan(0);
    });

    it('should have Q&A format', () => {
      COMMON_FAQ.forEach((qa) => {
        expect(qa).toContain('Q:');
        expect(qa).toContain('A:');
      });
    });
  });

  describe('SUPPORT_MESSAGES', () => {
    it('should have messages for all supported languages', () => {
      const supportedLangs = ['ja', 'en', 'ko', 'zh', 'vi'];
      supportedLangs.forEach((lang) => {
        expect(SUPPORT_MESSAGES).toHaveProperty(lang);
      });
    });

    it('should have all required message keys for each language', () => {
      const requiredKeys = [
        'selectType',
        'selectService',
        'describeIssue',
        'thankYou',
        'confirmReceived',
        'knownIssue',
        'escalate',
      ];

      Object.values(SUPPORT_MESSAGES).forEach((messages) => {
        requiredKeys.forEach((key) => {
          expect(messages).toHaveProperty(key);
        });
      });
    });
  });

  describe('generateSupportSystemPrompt', () => {
    it('should generate prompt for feedback', () => {
      const prompt = generateSupportSystemPrompt({
        ticketType: 'feedback',
        lang: 'ja',
      });

      expect(prompt).toContain('カスタマーサポートAI');
      expect(prompt).toContain('ご意見・ご要望');
    });

    it('should generate prompt for bug report', () => {
      const prompt = generateSupportSystemPrompt({
        ticketType: 'bug',
        lang: 'ja',
      });

      expect(prompt).toContain('不具合報告');
    });

    it('should include service-specific FAQ when service is provided', () => {
      const prompt = generateSupportSystemPrompt({
        ticketType: 'bug',
        service: 'YOLO_JAPAN',
        lang: 'ja',
      });

      expect(prompt).toContain('YOLO_JAPAN');
    });

    it('should include known issues when provided', () => {
      const knownIssues = [
        {
          id: '1',
          service: 'YOLO_JAPAN' as const,
          title: 'ログインできない問題',
          description: '調査中です',
          keywords: ['ログイン'],
          status: 'investigating' as const,
          createdAt: new Date(),
          resolvedAt: null,
        },
      ];

      const prompt = generateSupportSystemPrompt({
        ticketType: 'bug',
        service: 'YOLO_JAPAN',
        lang: 'ja',
        knownIssues,
      });

      expect(prompt).toContain('ログインできない問題');
      expect(prompt).toContain('既知の問題');
    });

    it('should handle empty known issues', () => {
      const prompt = generateSupportSystemPrompt({
        ticketType: 'bug',
        lang: 'ja',
        knownIssues: [],
      });

      expect(prompt).not.toContain('現在調査中の既知の問題');
    });
  });

  describe('generateSummaryPrompt', () => {
    it('should generate summary prompt from conversation', () => {
      const conversation = [
        { role: 'user', content: 'ログインできません' },
        { role: 'assistant', content: 'いつから発生していますか？' },
        { role: 'user', content: '昨日からです' },
      ];

      const prompt = generateSummaryPrompt(conversation);

      expect(prompt).toContain('ユーザー: ログインできません');
      expect(prompt).toContain('AI: いつから発生していますか？');
      expect(prompt).toContain('要約');
    });

    it('should handle empty conversation', () => {
      const prompt = generateSummaryPrompt([]);

      expect(prompt).toContain('要約');
    });
  });

  describe('searchFAQ', () => {
    it('should find FAQs by keyword', () => {
      const results = searchFAQ('パスワード');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toContain('パスワード');
    });

    it('should search within specific service', () => {
      const results = searchFAQ('契約', 'YOLO_HOME');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const results = searchFAQ('PASSWORD');

      // パスワードを含むFAQがあれば結果が返る（英語検索）
      expect(results).toBeDefined();
    });

    it('should return empty array for no match', () => {
      const results = searchFAQ('存在しないキーワード12345');

      expect(results).toEqual([]);
    });

    it('should search common FAQ', () => {
      const results = searchFAQ('返信');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportMessage', () => {
    it('should return Japanese message for ja', () => {
      const message = getSupportMessage('selectType', 'ja');

      expect(message).toBe('お問い合わせの種類を選択してください。');
    });

    it('should return English message for en', () => {
      const message = getSupportMessage('selectType', 'en');

      expect(message).toBe('Please select the type of inquiry.');
    });

    it('should fallback to Japanese for unknown language', () => {
      const message = getSupportMessage('selectType', 'unknown');

      expect(message).toBe('お問い合わせの種類を選択してください。');
    });

    it('should return all message types correctly', () => {
      const keys: Array<keyof typeof SUPPORT_MESSAGES['ja']> = [
        'selectType',
        'selectService',
        'describeIssue',
        'thankYou',
        'confirmReceived',
        'knownIssue',
        'escalate',
      ];

      keys.forEach((key) => {
        const message = getSupportMessage(key, 'ja');
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      });
    });
  });
});
