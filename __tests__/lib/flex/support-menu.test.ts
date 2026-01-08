import { describe, it, expect } from 'vitest';
import {
  createSupportMenuFlex,
  createServiceSelectFlex,
  createSupportCompleteFlex,
} from '@/lib/flex/support-menu';

describe('Support Menu Flex Messages', () => {
  describe('createSupportMenuFlex', () => {
    it('should create valid flex message structure', () => {
      const flex = createSupportMenuFlex('ja');

      expect(flex.type).toBe('flex');
      expect(flex.altText).toBeTruthy();
      expect(flex.contents).toBeDefined();
      expect(flex.contents.type).toBe('bubble');
    });

    it('should have header and body', () => {
      const flex = createSupportMenuFlex('ja');

      expect(flex.contents.header).toBeDefined();
      expect(flex.contents.body).toBeDefined();
    });

    it('should have Japanese text for ja language', () => {
      const flex = createSupportMenuFlex('ja');

      expect(flex.altText).toContain('お問い合わせ');
    });

    it('should have English text for en language', () => {
      const flex = createSupportMenuFlex('en');

      expect(flex.altText).toContain('Contact');
    });

    it('should have Korean text for ko language', () => {
      const flex = createSupportMenuFlex('ko');

      expect(flex.altText).toContain('문의');
    });

    it('should have Chinese text for zh language', () => {
      const flex = createSupportMenuFlex('zh');

      expect(flex.altText).toContain('联系');
    });

    it('should have Vietnamese text for vi language', () => {
      const flex = createSupportMenuFlex('vi');

      expect(flex.altText).toContain('liên hệ');
    });

    it('should fallback to Japanese for unknown language', () => {
      const flex = createSupportMenuFlex('unknown');

      expect(flex.altText).toContain('お問い合わせ');
    });

    it('should have feedback and bug buttons with postback actions', () => {
      const flex = createSupportMenuFlex('ja');
      const bodyContents = flex.contents.body?.contents || [];

      // Check that there are clickable boxes with postback actions
      const clickableBoxes = bodyContents.filter(
        (item: any) => item.type === 'box' && item.action?.type === 'postback'
      );

      expect(clickableBoxes.length).toBe(2);
    });

    it('should have correct postback data for feedback', () => {
      const flex = createSupportMenuFlex('ja');
      const bodyContents = flex.contents.body?.contents || [];

      const feedbackBox = bodyContents.find(
        (item: any) => item.action?.data?.includes('type=feedback')
      );

      expect(feedbackBox).toBeDefined();
      expect((feedbackBox as any).action.data).toContain('action=support');
    });

    it('should have correct postback data for bug', () => {
      const flex = createSupportMenuFlex('ja');
      const bodyContents = flex.contents.body?.contents || [];

      const bugBox = bodyContents.find(
        (item: any) => item.action?.data?.includes('type=bug')
      );

      expect(bugBox).toBeDefined();
      expect((bugBox as any).action.data).toContain('action=support');
    });
  });

  describe('createServiceSelectFlex', () => {
    it('should create valid flex message structure', () => {
      const flex = createServiceSelectFlex('ja');

      expect(flex.type).toBe('flex');
      expect(flex.contents.type).toBe('bubble');
    });

    it('should have three service buttons', () => {
      const flex = createServiceSelectFlex('ja');
      const bodyContents = flex.contents.body?.contents || [];

      // Count boxes with postback actions (excluding separators)
      const serviceBoxes = bodyContents.filter(
        (item: any) =>
          (item.type === 'box' && item.action?.type === 'postback') ||
          (item.type === 'box' && item.contents?.[0]?.action?.type === 'postback')
      );

      expect(serviceBoxes.length).toBeGreaterThanOrEqual(3);
    });

    it('should have YOLO_HOME service option', () => {
      const flex = createServiceSelectFlex('ja');
      const json = JSON.stringify(flex);

      expect(json).toContain('YOLO_HOME');
    });

    it('should have YOLO_DISCOVER service option', () => {
      const flex = createServiceSelectFlex('ja');
      const json = JSON.stringify(flex);

      expect(json).toContain('YOLO_DISCOVER');
    });

    it('should have YOLO_JAPAN service option', () => {
      const flex = createServiceSelectFlex('ja');
      const json = JSON.stringify(flex);

      expect(json).toContain('YOLO_JAPAN');
    });

    it('should have correct postback data format', () => {
      const flex = createServiceSelectFlex('ja');
      const json = JSON.stringify(flex);

      expect(json).toContain('action=support');
      expect(json).toContain('step=service');
    });

    it('should work for all supported languages', () => {
      const languages = ['ja', 'en', 'ko', 'zh', 'vi'];

      languages.forEach((lang) => {
        const flex = createServiceSelectFlex(lang);
        expect(flex.type).toBe('flex');
        expect(flex.contents).toBeDefined();
      });
    });
  });

  describe('createSupportCompleteFlex', () => {
    it('should create valid flex message for feedback', () => {
      const flex = createSupportCompleteFlex('ja', 'feedback');

      expect(flex.type).toBe('flex');
      expect(flex.contents.type).toBe('bubble');
    });

    it('should create valid flex message for bug', () => {
      const flex = createSupportCompleteFlex('ja', 'bug');

      expect(flex.type).toBe('flex');
      expect(flex.contents.type).toBe('bubble');
    });

    it('should have different messages for feedback and bug', () => {
      const feedbackFlex = createSupportCompleteFlex('ja', 'feedback');
      const bugFlex = createSupportCompleteFlex('ja', 'bug');

      expect(feedbackFlex.altText).not.toBe(bugFlex.altText);
    });

    it('should contain thank you message', () => {
      const flex = createSupportCompleteFlex('ja', 'feedback');
      const json = JSON.stringify(flex);

      expect(json).toContain('ありがとう');
    });

    it('should contain checkmark emoji', () => {
      const flex = createSupportCompleteFlex('ja', 'feedback');
      const json = JSON.stringify(flex);

      expect(json).toContain('✅');
    });

    it('should work for all supported languages', () => {
      const languages = ['ja', 'en', 'ko', 'zh', 'vi'];
      const types: Array<'feedback' | 'bug'> = ['feedback', 'bug'];

      languages.forEach((lang) => {
        types.forEach((type) => {
          const flex = createSupportCompleteFlex(lang, type);
          expect(flex.type).toBe('flex');
          expect(flex.altText).toBeTruthy();
        });
      });
    });

    it('should fallback to Japanese for unknown language', () => {
      const flex = createSupportCompleteFlex('unknown', 'feedback');

      expect(flex.altText).toContain('ありがとう');
    });
  });
});
