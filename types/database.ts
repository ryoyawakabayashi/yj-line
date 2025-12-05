export interface Database {
  public: {
    Tables: {
      user_status: {
        Row: {
          user_id: string;
          lang: string;
          rich_menu_id: string | null;
          ai_chat_count: number;
          diagnosis_count: number;
          total_usage_count: number;
          first_used: string;
          last_used: string;
          timestamp: string;
        };
        Insert: {
          user_id: string;
          lang: string;
          rich_menu_id?: string | null;
          ai_chat_count?: number;
          diagnosis_count?: number;
          total_usage_count?: number;
          first_used: string;
          last_used: string;
        };
        Update: {
          user_id?: string;
          lang?: string;
          rich_menu_id?: string | null;
          ai_chat_count?: number;
          diagnosis_count?: number;
          total_usage_count?: number;
          first_used?: string;
          last_used?: string;
        };
      };
      conversation_state: {
        Row: {
          user_id: string;
          state: any;
          timestamp: string;
        };
        Insert: {
          user_id: string;
          state: any;
        };
        Update: {
          user_id?: string;
          state?: any;
        };
      };
      user_answers: {
        Row: {
          id: number;
          user_id: string;
          timestamp: string;
          question: string;
          answer: string;
        };
        Insert: {
          user_id: string;
          question: string;
          answer: string;
        };
        Update: {
          user_id?: string;
          question?: string;
          answer?: string;
        };
      };
      ai_conversation_history: {
        Row: {
          user_id: string;
          history: any;
          timestamp: string;
        };
        Insert: {
          user_id: string;
          history: any;
        };
        Update: {
          user_id?: string;
          history?: any;
        };
      };
    };
  };
}
