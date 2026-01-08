import { describe, it, expect } from 'vitest';
import {
  toSupportTicket,
  toKnownIssue,
  getServiceDisplayName,
  getTicketTypeDisplayName,
  SupportTicketRow,
  KnownIssueRow,
} from '@/types/support';

describe('Support Types', () => {
  describe('toSupportTicket', () => {
    it('should convert SupportTicketRow to SupportTicket', () => {
      const row: SupportTicketRow = {
        id: '123',
        user_id: 'U12345',
        ticket_type: 'feedback',
        service: 'YOLO_JAPAN',
        content: 'テスト内容',
        ai_summary: 'テスト要約',
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const ticket = toSupportTicket(row);

      expect(ticket.id).toBe('123');
      expect(ticket.userId).toBe('U12345');
      expect(ticket.ticketType).toBe('feedback');
      expect(ticket.service).toBe('YOLO_JAPAN');
      expect(ticket.content).toBe('テスト内容');
      expect(ticket.aiSummary).toBe('テスト要約');
      expect(ticket.status).toBe('open');
      expect(ticket.createdAt).toBeInstanceOf(Date);
      expect(ticket.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle null service', () => {
      const row: SupportTicketRow = {
        id: '123',
        user_id: 'U12345',
        ticket_type: 'bug',
        service: null,
        content: 'テスト',
        ai_summary: null,
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const ticket = toSupportTicket(row);

      expect(ticket.service).toBeNull();
      expect(ticket.aiSummary).toBeNull();
    });

    it('should handle all ticket types', () => {
      const feedbackRow: SupportTicketRow = {
        id: '1',
        user_id: 'U1',
        ticket_type: 'feedback',
        service: null,
        content: '',
        ai_summary: null,
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const bugRow: SupportTicketRow = {
        id: '2',
        user_id: 'U2',
        ticket_type: 'bug',
        service: null,
        content: '',
        ai_summary: null,
        status: 'open',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(toSupportTicket(feedbackRow).ticketType).toBe('feedback');
      expect(toSupportTicket(bugRow).ticketType).toBe('bug');
    });

    it('should handle all status types', () => {
      const statuses: Array<'open' | 'in_progress' | 'resolved'> = [
        'open',
        'in_progress',
        'resolved',
      ];

      statuses.forEach((status) => {
        const row: SupportTicketRow = {
          id: '1',
          user_id: 'U1',
          ticket_type: 'feedback',
          service: null,
          content: '',
          ai_summary: null,
          status,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(toSupportTicket(row).status).toBe(status);
      });
    });
  });

  describe('toKnownIssue', () => {
    it('should convert KnownIssueRow to KnownIssue', () => {
      const row: KnownIssueRow = {
        id: '456',
        service: 'YOLO_HOME',
        title: 'テスト問題',
        description: '詳細説明',
        keywords: ['キーワード1', 'キーワード2'],
        status: 'investigating',
        created_at: '2024-01-01T00:00:00Z',
        resolved_at: null,
      };

      const issue = toKnownIssue(row);

      expect(issue.id).toBe('456');
      expect(issue.service).toBe('YOLO_HOME');
      expect(issue.title).toBe('テスト問題');
      expect(issue.description).toBe('詳細説明');
      expect(issue.keywords).toEqual(['キーワード1', 'キーワード2']);
      expect(issue.status).toBe('investigating');
      expect(issue.createdAt).toBeInstanceOf(Date);
      expect(issue.resolvedAt).toBeNull();
    });

    it('should handle null keywords', () => {
      const row: KnownIssueRow = {
        id: '1',
        service: 'YOLO_JAPAN',
        title: 'テスト',
        description: null,
        keywords: null,
        status: 'investigating',
        created_at: '2024-01-01T00:00:00Z',
        resolved_at: null,
      };

      const issue = toKnownIssue(row);

      expect(issue.keywords).toEqual([]);
    });

    it('should handle resolved_at date', () => {
      const row: KnownIssueRow = {
        id: '1',
        service: 'YOLO_JAPAN',
        title: 'テスト',
        description: null,
        keywords: null,
        status: 'resolved',
        created_at: '2024-01-01T00:00:00Z',
        resolved_at: '2024-01-15T00:00:00Z',
      };

      const issue = toKnownIssue(row);

      expect(issue.resolvedAt).toBeInstanceOf(Date);
    });

    it('should handle all status types', () => {
      const statuses: Array<'investigating' | 'resolved' | 'wontfix'> = [
        'investigating',
        'resolved',
        'wontfix',
      ];

      statuses.forEach((status) => {
        const row: KnownIssueRow = {
          id: '1',
          service: 'YOLO_JAPAN',
          title: 'テスト',
          description: null,
          keywords: null,
          status,
          created_at: '2024-01-01T00:00:00Z',
          resolved_at: null,
        };

        expect(toKnownIssue(row).status).toBe(status);
      });
    });

    it('should handle all service types', () => {
      const services: Array<'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN'> = [
        'YOLO_HOME',
        'YOLO_DISCOVER',
        'YOLO_JAPAN',
      ];

      services.forEach((service) => {
        const row: KnownIssueRow = {
          id: '1',
          service,
          title: 'テスト',
          description: null,
          keywords: null,
          status: 'investigating',
          created_at: '2024-01-01T00:00:00Z',
          resolved_at: null,
        };

        expect(toKnownIssue(row).service).toBe(service);
      });
    });
  });

  describe('getServiceDisplayName', () => {
    it('should return display name for YOLO_HOME', () => {
      expect(getServiceDisplayName('YOLO_HOME')).toBe('YOLO HOME');
    });

    it('should return display name for YOLO_DISCOVER', () => {
      expect(getServiceDisplayName('YOLO_DISCOVER')).toBe('YOLO DISCOVER');
    });

    it('should return display name for YOLO_JAPAN', () => {
      const name = getServiceDisplayName('YOLO_JAPAN');
      expect(name).toContain('YOLO JAPAN');
    });
  });

  describe('getTicketTypeDisplayName', () => {
    it('should return Japanese name for feedback', () => {
      expect(getTicketTypeDisplayName('feedback', 'ja')).toBe('ご意見・ご要望');
    });

    it('should return Japanese name for bug', () => {
      expect(getTicketTypeDisplayName('bug', 'ja')).toBe('不具合報告');
    });

    it('should return English name for feedback', () => {
      expect(getTicketTypeDisplayName('feedback', 'en')).toBe('Feedback');
    });

    it('should return English name for bug', () => {
      expect(getTicketTypeDisplayName('bug', 'en')).toBe('Bug Report');
    });

    it('should default to Japanese when no language specified', () => {
      expect(getTicketTypeDisplayName('feedback')).toBe('ご意見・ご要望');
    });

    it('should return English for unsupported languages', () => {
      expect(getTicketTypeDisplayName('feedback', 'ko')).toBe('Feedback');
    });
  });
});
