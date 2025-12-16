// Dashboard type definitions

export interface DashboardStats {
  totalUsers: number;
  totalDiagnosis: number;
  totalAIChats: number;
  todayActiveUsers: number;
  repeatUserCount: number;
  repeatRate: number;
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
}
