// Dashboard type definitions

export interface DashboardStats {
  totalUsers: number;
  totalDiagnosis: number;
  diagnosisUserCount: number;
  totalAIChats: number;
  todayActiveUsers: number;
  repeatUserCount: number;
  repeatRate: number;
  // LINE統計
  lineFollowers?: number;
  lineFollowersAdded?: number; // 期間内の友だち追加数（follow_eventsテーブルから）
  // GA4セッション
  sessions?: number;
  // YJ/YD CV統計
  yjRegistrations?: number;
  yjApplications?: number;
  ydRegistrations?: number;
  ydApplications?: number;
  // 診断ファネル（line/chatbot経由）
  siteTransitionSessions?: number;  // セッション数（クリック数）
  siteTransitionUsers?: number;     // ユニークユーザー数
}

export interface LanguageDistribution {
  lang: string;
  count: number;
}

export interface LevelDistribution {
  level: string;
  count: number;
}

export interface IndustryDistribution {
  industry: string;
  count: number;
}

export interface RegionDistribution {
  region: string;
  count: number;
}

export interface DailyTrend {
  date: string;
  count: number;
  newUsers?: number;
  repeatUsers?: number;
}

export interface Activity {
  userId: string;
  lang: string;
  lastUsed: string;
  diagnosisCount: number;
  aiChatCount: number;
}

export interface DailyUsageTrend {
  date: string;
  diagnosisCount: number;
}

export interface TopUser {
  userId: string;
  lang: string;
  diagnosisCount: number;
  aiChatCount: number;
  totalUsage: number;
  rank: number;
}

// GA4 Analytics types
export interface GA4ConversionBySource {
  source: string;
  registrations: number;
  applications: number;
  conversions: number;
  sessions: number;
  engagementRate: number;
  averageSessionDuration: number;
  // YJ/YD separated
  yjRegistrations: number;
  yjApplications: number;
  ydRegistrations: number;
  ydApplications: number;
}

export interface GA4DailyConversion {
  date: string;
  registrations: number;
  applications: number;
  conversions: number;
  sessions: number;
  bySource: Record<string, number>;
  bySourceSessions: Record<string, number>;
  bySourceRegistrations: Record<string, number>;
  bySourceApplications: Record<string, number>;
  // YJ/YD separated
  yjRegistrations: number;
  yjApplications: number;
  ydRegistrations: number;
  ydApplications: number;
}

// Active user history
export interface ActiveUserHistory {
  date: string;
  count: number;
}

// LINE follower statistics
export interface LineFollowerStats {
  followers: number;
  targetedReaches: number;
  blocks: number;
}
