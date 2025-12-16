import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GA4_CONFIG, LINE_SOURCES, SOURCE_LABELS } from './config';
import type { GA4ConversionBySource, GA4DailyConversion } from '@/types/dashboard';

// Initialize GA4 client
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: GA4_CONFIG.serviceAccount,
});

/**
 * Get conversion data grouped by source
 * @param days Number of days to look back (default: 30)
 */
export async function getConversionsBySource(days: number = 30): Promise<GA4ConversionBySource[]> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'sessionSource',
        },
        {
          name: 'sessionMedium',
        },
      ],
      metrics: [
        {
          name: 'conversions',
        },
        {
          name: 'sessions',
        },
        {
          name: 'engagementRate',
        },
        {
          name: 'averageSessionDuration',
        },
      ],
      dimensionFilter: {
        orGroup: {
          expressions: LINE_SOURCES.map((source) => {
            const [sourceValue, mediumValue] = source.split(' / ');
            return {
              andGroup: {
                expressions: [
                  {
                    filter: {
                      fieldName: 'sessionSource',
                      stringFilter: {
                        matchType: 'EXACT',
                        value: sourceValue,
                      },
                    },
                  },
                  {
                    filter: {
                      fieldName: 'sessionMedium',
                      stringFilter: {
                        matchType: 'EXACT',
                        value: mediumValue,
                      },
                    },
                  },
                ],
              },
            };
          }),
        },
      },
    });

    if (!response.rows || response.rows.length === 0) {
      return [];
    }

    // Aggregate by source/medium combination
    const sourceMap: Record<string, { conversions: number; sessions: number; engagementRate: number; avgDuration: number; count: number }> = {};

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const source = row.dimensionValues[0]?.value || '';
        const medium = row.dimensionValues[1]?.value || '';
        const conversions = Number(row.metricValues[0]?.value || 0);
        const sessions = Number(row.metricValues[1]?.value || 0);
        const engagementRate = Number(row.metricValues[2]?.value || 0);
        const avgDuration = Number(row.metricValues[3]?.value || 0);

        const sourceKey = `${source} / ${medium}`;

        // Only include LINE sources we're tracking
        if (LINE_SOURCES.includes(sourceKey as any)) {
          if (!sourceMap[sourceKey]) {
            sourceMap[sourceKey] = { conversions: 0, sessions: 0, engagementRate: 0, avgDuration: 0, count: 0 };
          }
          sourceMap[sourceKey].conversions += conversions;
          sourceMap[sourceKey].sessions += sessions;
          sourceMap[sourceKey].engagementRate += engagementRate;
          sourceMap[sourceKey].avgDuration += avgDuration;
          sourceMap[sourceKey].count += 1;
        }
      }
    });

    return Object.entries(sourceMap)
      .map(([source, data]) => ({
        source: SOURCE_LABELS[source] || source,
        conversions: data.conversions,
        sessions: data.sessions,
        engagementRate: data.count > 0 ? data.engagementRate / data.count : 0,
        averageSessionDuration: data.count > 0 ? data.avgDuration / data.count : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);
  } catch (error) {
    console.error('Error fetching GA4 conversions by source:', error);
    return [];
  }
}

/**
 * Get daily conversion trends by source
 * @param days Number of days to look back (default: 30)
 */
export async function getDailyConversionTrends(days: number = 30): Promise<GA4DailyConversion[]> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'date',
        },
        {
          name: 'sessionSource',
        },
        {
          name: 'sessionMedium',
        },
      ],
      metrics: [
        {
          name: 'conversions',
        },
        {
          name: 'sessions',
        },
      ],
      dimensionFilter: {
        orGroup: {
          expressions: LINE_SOURCES.map((source) => {
            const [sourceValue, mediumValue] = source.split(' / ');
            return {
              andGroup: {
                expressions: [
                  {
                    filter: {
                      fieldName: 'sessionSource',
                      stringFilter: {
                        matchType: 'EXACT',
                        value: sourceValue,
                      },
                    },
                  },
                  {
                    filter: {
                      fieldName: 'sessionMedium',
                      stringFilter: {
                        matchType: 'EXACT',
                        value: mediumValue,
                      },
                    },
                  },
                ],
              },
            };
          }),
        },
      },
      orderBys: [
        {
          dimension: {
            dimensionName: 'date',
          },
        },
      ],
    });

    if (!response.rows || response.rows.length === 0) {
      return [];
    }

    // Aggregate by date and source
    const dailyMap: Record<string, { conversions: number; sessions: number; bySource: Record<string, number>; bySourceSessions: Record<string, number> }> = {};

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const date = row.dimensionValues[0]?.value || '';
        const source = row.dimensionValues[1]?.value || '';
        const medium = row.dimensionValues[2]?.value || '';
        const conversions = Number(row.metricValues[0]?.value || 0);
        const sessions = Number(row.metricValues[1]?.value || 0);

        const sourceKey = `${source} / ${medium}`;

        // Only include LINE sources we're tracking
        if (LINE_SOURCES.includes(sourceKey as any)) {
          if (!dailyMap[date]) {
            dailyMap[date] = { conversions: 0, sessions: 0, bySource: {}, bySourceSessions: {} };
          }

          const sourceLabel = SOURCE_LABELS[sourceKey] || sourceKey;
          dailyMap[date].conversions += conversions;
          dailyMap[date].sessions += sessions;
          dailyMap[date].bySource[sourceLabel] = (dailyMap[date].bySource[sourceLabel] || 0) + conversions;
          dailyMap[date].bySourceSessions[sourceLabel] = (dailyMap[date].bySourceSessions[sourceLabel] || 0) + sessions;
        }
      }
    });

    return Object.entries(dailyMap)
      .map(([date, data]) => ({
        date: formatDate(date),
        conversions: data.conversions,
        sessions: data.sessions,
        bySource: data.bySource,
        bySourceSessions: data.bySourceSessions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching GA4 daily conversion trends:', error);
    return [];
  }
}

/**
 * Format GA4 date string (YYYYMMDD) to readable format (YYYY-MM-DD)
 */
function formatDate(dateString: string): string {
  if (dateString.length !== 8) return dateString;

  const year = dateString.substring(0, 4);
  const month = dateString.substring(4, 6);
  const day = dateString.substring(6, 8);

  return `${year}-${month}-${day}`;
}
