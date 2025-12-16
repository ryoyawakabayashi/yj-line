// Dashboard type definitions

export interface DashboardStats {
  totalUsers: number;
  totalDiagnosis: number;
  totalAIChats: number;
  todayActiveUsers: number;
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
