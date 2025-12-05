export interface LineEvent {
  type: string;
  source: {
    userId: string;
    type?: string;
  };
  replyToken: string;
  message?: {
    type: string;
    text?: string;
    id?: string;
  };
  postback?: {
    data: string;
    params?: any;
  };
  timestamp?: number;
}

export interface LineMessage {
  type: 'text' | 'flex' | 'template';
  text?: string;
  quickReply?: {
    items: QuickReplyItem[];
  };
  altText?: string;
  contents?: any;
  template?: any;
}

export interface QuickReplyItem {
  type: 'action';
  action: {
    type: 'message' | 'uri' | 'postback';
    label: string;
    text?: string;
    uri?: string;
    data?: string;
  };
}

export interface LineWebhookBody {
  events: LineEvent[];
  destination?: string;
}
