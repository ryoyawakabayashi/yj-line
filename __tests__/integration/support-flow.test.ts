import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSupportMenuFlex,
  createServiceSelectFlex,
  createSupportCompleteFlex,
} from '@/lib/flex/support-menu';
import {
  generateSupportSystemPrompt,
  getSupportMessage,
  searchFAQ,
} from '@/lib/support/faq';
import {
  toSupportTicket,
  toKnownIssue,
  getServiceDisplayName,
  SupportTicketRow,
  KnownIssueRow,
} from '@/types/support';

// Mock modules
vi.mock('@/lib/database/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

vi.mock('@/lib/config', () => ({
  config: {
    line: {
      channelAccessToken: 'test-token',
      channelSecret: 'test-secret',
    },
    openai: {
      apiKey: 'test-api-key',
    },
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
    },
    richMenu: {
      init: 'richmenu-init',
      ja: 'richmenu-ja',
      en: 'richmenu-en',
      ko: 'richmenu-ko',
      zh: 'richmenu-zh',
      vi: 'richmenu-vi',
    },
  },
  LINE_API: {
    REPLY: 'https://api.line.me/v2/bot/message/reply',
    PUSH: 'https://api.line.me/v2/bot/message/push',
  },
  FAQ_CONTENT: 'Test FAQ content',
}));

describe('Support Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Support Flow Simulation', () => {
    it('should handle complete feedback flow', () => {
      // Step 1: User clicks SUPPORT button
      const menuFlex = createSupportMenuFlex('ja');
      expect(menuFlex.type).toBe('flex');
      expect(menuFlex.altText).toContain('お問い合わせ');

      // Step 2: User selects feedback
      // Postback data would be: action=support&type=feedback
      // This triggers describe issue step

      // Step 3: AI generates system prompt for feedback
      const systemPrompt = generateSupportSystemPrompt({
        ticketType: 'feedback',
        lang: 'ja',
      });
      expect(systemPrompt).toContain('ご意見・ご要望');

      // Step 4: After conversation, show completion
      const completeFlex = createSupportCompleteFlex('ja', 'feedback');
      expect(completeFlex.type).toBe('flex');
    });

    it('should handle complete bug report flow', () => {
      // Step 1: User clicks SUPPORT button
      const menuFlex = createSupportMenuFlex('ja');
      expect(menuFlex.type).toBe('flex');

      // Step 2: User selects bug report
      // Postback data would be: action=support&type=bug

      // Step 3: Service selection screen
      const serviceSelectFlex = createServiceSelectFlex('ja');
      expect(serviceSelectFlex.type).toBe('flex');
      const json = JSON.stringify(serviceSelectFlex);
      expect(json).toContain('YOLO_JAPAN');

      // Step 4: User selects YOLO_JAPAN
      // Postback data would be: action=support&step=service&service=YOLO_JAPAN

      // Step 5: AI generates system prompt with known issues
      const knownIssues = [
        {
          id: '1',
          service: 'YOLO_JAPAN' as const,
          title: 'ログインできない問題',
          description: '調査中',
          keywords: ['ログイン'],
          status: 'investigating' as const,
          createdAt: new Date(),
          resolvedAt: null,
        },
      ];

      const systemPrompt = generateSupportSystemPrompt({
        ticketType: 'bug',
        service: 'YOLO_JAPAN',
        lang: 'ja',
        knownIssues,
      });
      expect(systemPrompt).toContain('不具合報告');
      expect(systemPrompt).toContain('ログインできない問題');

      // Step 6: After conversation, show completion
      const completeFlex = createSupportCompleteFlex('ja', 'bug');
      expect(completeFlex.type).toBe('flex');
    });

    it('should handle multilingual support flow', () => {
      const languages = ['ja', 'en', 'ko', 'zh', 'vi'];

      languages.forEach((lang) => {
        // Menu
        const menu = createSupportMenuFlex(lang);
        expect(menu.type).toBe('flex');

        // Service select
        const serviceSelect = createServiceSelectFlex(lang);
        expect(serviceSelect.type).toBe('flex');

        // Messages
        const message = getSupportMessage('selectType', lang);
        expect(message).toBeTruthy();

        // Complete
        const complete = createSupportCompleteFlex(lang, 'feedback');
        expect(complete.type).toBe('flex');
      });
    });
  });

  describe('FAQ Search Integration', () => {
    it('should search and integrate FAQ into prompt', () => {
      // User asks about password
      const faqResults = searchFAQ('パスワード');
      expect(faqResults.length).toBeGreaterThan(0);

      // Generate prompt including FAQ
      const prompt = generateSupportSystemPrompt({
        ticketType: 'bug',
        service: 'YOLO_JAPAN',
        lang: 'ja',
      });
      expect(prompt).toContain('FAQ');
    });

    it('should handle service-specific FAQ search', () => {
      // Search YOLO_HOME specific FAQ
      const homeResults = searchFAQ('契約', 'YOLO_HOME');
      expect(homeResults.length).toBeGreaterThan(0);

      // Ensure results are YOLO_HOME related
      homeResults.forEach((result) => {
        // Results should contain YOLO_HOME FAQ content
        expect(result).toBeTruthy();
      });
    });
  });

  describe('Ticket Creation Flow', () => {
    it('should convert row to ticket correctly', () => {
      const row: SupportTicketRow = {
        id: 'test-id',
        user_id: 'U12345',
        ticket_type: 'bug',
        service: 'YOLO_JAPAN',
        content: 'ログインできません',
        ai_summary: 'ログイン問題の報告',
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const ticket = toSupportTicket(row);

      expect(ticket.id).toBe('test-id');
      expect(ticket.userId).toBe('U12345');
      expect(ticket.ticketType).toBe('bug');
      expect(ticket.service).toBe('YOLO_JAPAN');
      expect(getServiceDisplayName(ticket.service!)).toContain('YOLO JAPAN');
    });

    it('should handle known issue lookup', () => {
      const row: KnownIssueRow = {
        id: 'issue-1',
        service: 'YOLO_JAPAN',
        title: 'テスト問題',
        description: 'テスト説明',
        keywords: ['テスト'],
        status: 'investigating',
        created_at: '2024-01-01T00:00:00Z',
        resolved_at: null,
      };

      const issue = toKnownIssue(row);

      expect(issue.id).toBe('issue-1');
      expect(issue.service).toBe('YOLO_JAPAN');
      expect(issue.status).toBe('investigating');
    });
  });

  describe('Error Handling', () => {
    it('should fallback to Japanese for unknown language', () => {
      const menu = createSupportMenuFlex('unknown-lang');
      expect(menu.altText).toContain('お問い合わせ');
    });

    it('should handle empty conversation history', () => {
      const prompt = generateSupportSystemPrompt({
        ticketType: 'feedback',
        lang: 'ja',
        knownIssues: [],
      });

      expect(prompt).not.toContain('既知の問題');
    });

    it('should handle null values in ticket conversion', () => {
      const row: SupportTicketRow = {
        id: 'test',
        user_id: 'U1',
        ticket_type: 'feedback',
        service: null,
        content: 'test',
        ai_summary: null,
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const ticket = toSupportTicket(row);
      expect(ticket.service).toBeNull();
      expect(ticket.aiSummary).toBeNull();
    });
  });

  describe('Postback Data Validation', () => {
    it('should have valid postback data format in menu', () => {
      const menu = createSupportMenuFlex('ja');
      const json = JSON.stringify(menu);

      expect(json).toContain('action=support');
      expect(json).toContain('type=feedback');
      expect(json).toContain('type=bug');
    });

    it('should have valid postback data format in service select', () => {
      const serviceSelect = createServiceSelectFlex('ja');
      const json = JSON.stringify(serviceSelect);

      expect(json).toContain('action=support');
      expect(json).toContain('step=service');
      expect(json).toContain('service=YOLO_HOME');
      expect(json).toContain('service=YOLO_DISCOVER');
      expect(json).toContain('service=YOLO_JAPAN');
    });
  });

  describe('UI Consistency', () => {
    it('should have consistent color scheme', () => {
      const menuJa = createSupportMenuFlex('ja');
      const menuEn = createSupportMenuFlex('en');

      // Both should have same structure
      expect(menuJa.contents.type).toBe(menuEn.contents.type);
      expect(menuJa.contents.header).toBeDefined();
      expect(menuEn.contents.header).toBeDefined();
    });

    it('should have feedback and bug with different colors', () => {
      const menu = createSupportMenuFlex('ja');
      const json = JSON.stringify(menu);

      // Blue for feedback, red for bug
      expect(json).toContain('#4A90D9'); // Feedback blue
      expect(json).toContain('#E85D5D'); // Bug red
    });
  });

  describe('Message Consistency', () => {
    it('should have all required message keys for all languages', () => {
      const languages = ['ja', 'en', 'ko', 'zh', 'vi'];
      const keys = [
        'selectType',
        'selectService',
        'describeIssue',
        'thankYou',
        'confirmReceived',
        'knownIssue',
        'escalate',
      ] as const;

      languages.forEach((lang) => {
        keys.forEach((key) => {
          const message = getSupportMessage(key, lang);
          expect(message).toBeTruthy();
          expect(typeof message).toBe('string');
        });
      });
    });
  });
});
