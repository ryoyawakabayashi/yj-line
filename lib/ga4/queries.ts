import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GA4_CONFIG, LINE_SOURCES, SOURCE_LABELS, GA4_KEY_EVENTS } from './config';
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
    // Get all key events (registration + application)
    const allKeyEvents = [...GA4_KEY_EVENTS.registration, ...GA4_KEY_EVENTS.application];

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
        {
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
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
        andGroup: {
          expressions: [
            // Filter by LINE sources
            {
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
            // Filter by key events
            {
              orGroup: {
                expressions: allKeyEvents.map((eventName) => ({
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: eventName,
                    },
                  },
                })),
              },
            },
          ],
        },
      },
    });

    if (!response.rows || response.rows.length === 0) {
      return [];
    }

    // Aggregate by source/medium combination
    const sourceMap: Record<
      string,
      {
        registrations: number;
        applications: number;
        sessions: number;
        engagementRate: number;
        avgDuration: number;
        count: number;
      }
    > = {};

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const source = row.dimensionValues[0]?.value || '';
        const medium = row.dimensionValues[1]?.value || '';
        const eventName = row.dimensionValues[2]?.value || '';
        const eventCount = Number(row.metricValues[0]?.value || 0);
        const sessions = Number(row.metricValues[1]?.value || 0);
        const engagementRate = Number(row.metricValues[2]?.value || 0);
        const avgDuration = Number(row.metricValues[3]?.value || 0);

        const sourceKey = `${source} / ${medium}`;

        // Only include LINE sources we're tracking
        if (LINE_SOURCES.includes(sourceKey as any)) {
          if (!sourceMap[sourceKey]) {
            sourceMap[sourceKey] = {
              registrations: 0,
              applications: 0,
              sessions: 0,
              engagementRate: 0,
              avgDuration: 0,
              count: 0,
            };
          }

          // Categorize events
          if (GA4_KEY_EVENTS.registration.includes(eventName as any)) {
            sourceMap[sourceKey].registrations += eventCount;
          } else if (GA4_KEY_EVENTS.application.includes(eventName as any)) {
            sourceMap[sourceKey].applications += eventCount;
          }

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
        registrations: data.registrations,
        applications: data.applications,
        conversions: data.registrations + data.applications,
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
    // Get all key events (registration + application)
    const allKeyEvents = [...GA4_KEY_EVENTS.registration, ...GA4_KEY_EVENTS.application];

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
        {
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
        },
        {
          name: 'sessions',
        },
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            // Filter by LINE sources
            {
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
            // Filter by key events
            {
              orGroup: {
                expressions: allKeyEvents.map((eventName) => ({
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: eventName,
                    },
                  },
                })),
              },
            },
          ],
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
    const dailyMap: Record<
      string,
      {
        registrations: number;
        applications: number;
        sessions: number;
        bySource: Record<string, number>;
        bySourceSessions: Record<string, number>;
        bySourceRegistrations: Record<string, number>;
        bySourceApplications: Record<string, number>;
      }
    > = {};

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const date = row.dimensionValues[0]?.value || '';
        const source = row.dimensionValues[1]?.value || '';
        const medium = row.dimensionValues[2]?.value || '';
        const eventName = row.dimensionValues[3]?.value || '';
        const eventCount = Number(row.metricValues[0]?.value || 0);
        const sessions = Number(row.metricValues[1]?.value || 0);

        const sourceKey = `${source} / ${medium}`;

        // Only include LINE sources we're tracking
        if (LINE_SOURCES.includes(sourceKey as any)) {
          if (!dailyMap[date]) {
            dailyMap[date] = {
              registrations: 0,
              applications: 0,
              sessions: 0,
              bySource: {},
              bySourceSessions: {},
              bySourceRegistrations: {},
              bySourceApplications: {},
            };
          }

          const sourceLabel = SOURCE_LABELS[sourceKey] || sourceKey;

          // Categorize events
          if (GA4_KEY_EVENTS.registration.includes(eventName as any)) {
            dailyMap[date].registrations += eventCount;
            dailyMap[date].bySourceRegistrations[sourceLabel] =
              (dailyMap[date].bySourceRegistrations[sourceLabel] || 0) + eventCount;
          } else if (GA4_KEY_EVENTS.application.includes(eventName as any)) {
            dailyMap[date].applications += eventCount;
            dailyMap[date].bySourceApplications[sourceLabel] =
              (dailyMap[date].bySourceApplications[sourceLabel] || 0) + eventCount;
          }

          // Total conversions per source
          dailyMap[date].bySource[sourceLabel] = (dailyMap[date].bySource[sourceLabel] || 0) + eventCount;
          dailyMap[date].sessions += sessions;
          dailyMap[date].bySourceSessions[sourceLabel] =
            (dailyMap[date].bySourceSessions[sourceLabel] || 0) + sessions;
        }
      }
    });

    return Object.entries(dailyMap)
      .map(([date, data]) => ({
        date: formatDate(date),
        registrations: data.registrations,
        applications: data.applications,
        conversions: data.registrations + data.applications,
        sessions: data.sessions,
        bySource: data.bySource,
        bySourceSessions: data.bySourceSessions,
        bySourceRegistrations: data.bySourceRegistrations,
        bySourceApplications: data.bySourceApplications,
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
