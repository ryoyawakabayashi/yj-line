import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GA4_CONFIG, LINE_SOURCES, LINE_BOT_FUNNEL_SOURCES, DIAGNOSIS_FUNNEL_SOURCES, DIAGNOSIS_SOURCES, SOURCE_LABELS, GA4_KEY_EVENTS, getAllKeyEvents, FUNNEL_SOURCES, type FunnelType } from './config';
import type { GA4ConversionBySource, GA4DailyConversion } from '@/types/dashboard';

// Initialize GA4 client
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: GA4_CONFIG.serviceAccount,
});

// Helper to check event category
function isYjRegistration(eventName: string): boolean {
  return GA4_KEY_EVENTS.yj.registration.includes(eventName as any);
}

function isYjApplication(eventName: string): boolean {
  return GA4_KEY_EVENTS.yj.application.includes(eventName as any);
}

function isYdRegistration(eventName: string): boolean {
  return GA4_KEY_EVENTS.yd.registration.includes(eventName as any);
}

function isYdApplication(eventName: string): boolean {
  return GA4_KEY_EVENTS.yd.application.includes(eventName as any);
}

/**
 * Get conversion data grouped by source
 * @param days Number of days to look back (default: 30)
 */
export async function getConversionsBySource(days: number = 30): Promise<GA4ConversionBySource[]> {
  try {
    const allKeyEvents = getAllKeyEvents();

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
        yjRegistrations: number;
        yjApplications: number;
        ydRegistrations: number;
        ydApplications: number;
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
              yjRegistrations: 0,
              yjApplications: 0,
              ydRegistrations: 0,
              ydApplications: 0,
              sessions: 0,
              engagementRate: 0,
              avgDuration: 0,
              count: 0,
            };
          }

          // Categorize events by YJ/YD
          if (isYjRegistration(eventName)) {
            sourceMap[sourceKey].yjRegistrations += eventCount;
          } else if (isYjApplication(eventName)) {
            sourceMap[sourceKey].yjApplications += eventCount;
          } else if (isYdRegistration(eventName)) {
            sourceMap[sourceKey].ydRegistrations += eventCount;
          } else if (isYdApplication(eventName)) {
            sourceMap[sourceKey].ydApplications += eventCount;
          }

          sourceMap[sourceKey].sessions += sessions;
          sourceMap[sourceKey].engagementRate += engagementRate;
          sourceMap[sourceKey].avgDuration += avgDuration;
          sourceMap[sourceKey].count += 1;
        }
      }
    });

    // ラベル単位で統合（同じラベルを持つソースをまとめる）
    const labelMap: Record<
      string,
      {
        yjRegistrations: number;
        yjApplications: number;
        ydRegistrations: number;
        ydApplications: number;
        sessions: number;
        engagementRate: number;
        avgDuration: number;
        count: number;
      }
    > = {};

    Object.entries(sourceMap).forEach(([sourceKey, data]) => {
      const label = SOURCE_LABELS[sourceKey] || sourceKey;
      if (!labelMap[label]) {
        labelMap[label] = {
          yjRegistrations: 0,
          yjApplications: 0,
          ydRegistrations: 0,
          ydApplications: 0,
          sessions: 0,
          engagementRate: 0,
          avgDuration: 0,
          count: 0,
        };
      }
      labelMap[label].yjRegistrations += data.yjRegistrations;
      labelMap[label].yjApplications += data.yjApplications;
      labelMap[label].ydRegistrations += data.ydRegistrations;
      labelMap[label].ydApplications += data.ydApplications;
      labelMap[label].sessions += data.sessions;
      labelMap[label].engagementRate += data.engagementRate;
      labelMap[label].avgDuration += data.avgDuration;
      labelMap[label].count += data.count;
    });

    return Object.entries(labelMap)
      .map(([label, data]) => ({
        source: label,
        yjRegistrations: data.yjRegistrations,
        yjApplications: data.yjApplications,
        ydRegistrations: data.ydRegistrations,
        ydApplications: data.ydApplications,
        registrations: data.yjRegistrations + data.ydRegistrations,
        applications: data.yjApplications + data.ydApplications,
        conversions: data.yjRegistrations + data.yjApplications + data.ydRegistrations + data.ydApplications,
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
    const allKeyEvents = getAllKeyEvents();

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
        yjRegistrations: number;
        yjApplications: number;
        ydRegistrations: number;
        ydApplications: number;
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
              yjRegistrations: 0,
              yjApplications: 0,
              ydRegistrations: 0,
              ydApplications: 0,
              sessions: 0,
              bySource: {},
              bySourceSessions: {},
              bySourceRegistrations: {},
              bySourceApplications: {},
            };
          }

          const sourceLabel = SOURCE_LABELS[sourceKey] || sourceKey;

          // Categorize events by YJ/YD
          if (isYjRegistration(eventName)) {
            dailyMap[date].yjRegistrations += eventCount;
            dailyMap[date].bySourceRegistrations[sourceLabel] =
              (dailyMap[date].bySourceRegistrations[sourceLabel] || 0) + eventCount;
          } else if (isYjApplication(eventName)) {
            dailyMap[date].yjApplications += eventCount;
            dailyMap[date].bySourceApplications[sourceLabel] =
              (dailyMap[date].bySourceApplications[sourceLabel] || 0) + eventCount;
          } else if (isYdRegistration(eventName)) {
            dailyMap[date].ydRegistrations += eventCount;
            dailyMap[date].bySourceRegistrations[sourceLabel] =
              (dailyMap[date].bySourceRegistrations[sourceLabel] || 0) + eventCount;
          } else if (isYdApplication(eventName)) {
            dailyMap[date].ydApplications += eventCount;
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
        yjRegistrations: data.yjRegistrations,
        yjApplications: data.yjApplications,
        ydRegistrations: data.ydRegistrations,
        ydApplications: data.ydApplications,
        registrations: data.yjRegistrations + data.ydRegistrations,
        applications: data.yjApplications + data.ydApplications,
        conversions: data.yjRegistrations + data.yjApplications + data.ydRegistrations + data.ydApplications,
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
 * Get total sessions from GA4
 * @param days Number of days to look back (default: 30)
 */
export async function getTotalSessions(days: number = 30): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate: `${days}daysAgo`,
          endDate: 'today',
        },
      ],
      metrics: [
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
    });

    if (!response.rows || response.rows.length === 0) {
      return 0;
    }

    return Number(response.rows[0]?.metricValues?.[0]?.value || 0);
  } catch (error) {
    console.error('Error fetching GA4 total sessions:', error);
    return 0;
  }
}

/**
 * Get YJ/YD conversion totals
 * @param days Number of days to look back (default: 30)
 */
export async function getYjYdConversionTotals(days: number = 30): Promise<{
  yjRegistrations: number;
  yjApplications: number;
  ydRegistrations: number;
  ydApplications: number;
}> {
  try {
    const allKeyEvents = getAllKeyEvents();

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
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
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

    const result = {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };

    if (!response.rows || response.rows.length === 0) {
      return result;
    }

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const eventName = row.dimensionValues[0]?.value || '';
        const eventCount = Number(row.metricValues[0]?.value || 0);

        if (isYjRegistration(eventName)) {
          result.yjRegistrations += eventCount;
        } else if (isYjApplication(eventName)) {
          result.yjApplications += eventCount;
        } else if (isYdRegistration(eventName)) {
          result.ydRegistrations += eventCount;
        } else if (isYdApplication(eventName)) {
          result.ydApplications += eventCount;
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching YJ/YD conversion totals:', error);
    return {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };
  }
}

/**
 * Get sessions by date range
 */
export async function getSessionsByDateRange(startDate: string, endDate: string): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      metrics: [
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
    });

    if (!response.rows || response.rows.length === 0) {
      return 0;
    }

    return Number(response.rows[0]?.metricValues?.[0]?.value || 0);
  } catch (error) {
    console.error('Error fetching GA4 sessions by date range:', error);
    return 0;
  }
}

/**
 * Get YJ/YD conversions by date range
 */
export async function getYjYdConversionsByDateRange(
  startDate: string,
  endDate: string
): Promise<{
  yjRegistrations: number;
  yjApplications: number;
  ydRegistrations: number;
  ydApplications: number;
}> {
  try {
    const allKeyEvents = getAllKeyEvents();

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        {
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
        },
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
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

    const result = {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };

    if (!response.rows || response.rows.length === 0) {
      return result;
    }

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const eventName = row.dimensionValues[0]?.value || '';
        const eventCount = Number(row.metricValues[0]?.value || 0);

        if (isYjRegistration(eventName)) {
          result.yjRegistrations += eventCount;
        } else if (isYjApplication(eventName)) {
          result.yjApplications += eventCount;
        } else if (isYdRegistration(eventName)) {
          result.ydRegistrations += eventCount;
        } else if (isYdApplication(eventName)) {
          result.ydApplications += eventCount;
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching YJ/YD conversions by date range:', error);
    return {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };
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

/**
 * Helper to build source filter for GA4 queries
 */
function buildSourceFilter(sources: readonly string[]) {
  return {
    orGroup: {
      expressions: sources.map((source) => {
        const [sourceValue, mediumValue] = source.split(' / ');
        return {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'sessionSource',
                  stringFilter: {
                    matchType: 'EXACT' as const,
                    value: sourceValue,
                  },
                },
              },
              {
                filter: {
                  fieldName: 'sessionMedium',
                  stringFilter: {
                    matchType: 'EXACT' as const,
                    value: mediumValue,
                  },
                },
              },
            ],
          },
        };
      }),
    },
  };
}

/**
 * Get sessions by date range filtered by LINE Bot funnel sources only
 * (menu, chatbot, message - excludes autochat, step.lme.jp, instagram)
 */
export async function getFunnelSessionsByDateRange(startDate: string, endDate: string): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      metrics: [
        {
          name: 'sessions',
        },
      ],
      dimensionFilter: buildSourceFilter(LINE_BOT_FUNNEL_SOURCES),
    });

    if (!response.rows || response.rows.length === 0) {
      return 0;
    }

    return Number(response.rows[0]?.metricValues?.[0]?.value || 0);
  } catch (error) {
    console.error('Error fetching GA4 funnel sessions by date range:', error);
    return 0;
  }
}

/**
 * Get YJ/YD conversions by date range filtered by LINE Bot funnel sources only
 * (menu, chatbot, message - excludes autochat, step.lme.jp, instagram)
 */
export async function getFunnelConversionsByDateRange(
  startDate: string,
  endDate: string
): Promise<{
  yjRegistrations: number;
  yjApplications: number;
  ydRegistrations: number;
  ydApplications: number;
}> {
  try {
    const allKeyEvents = getAllKeyEvents();

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        {
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
        },
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            buildSourceFilter(LINE_BOT_FUNNEL_SOURCES),
            {
              orGroup: {
                expressions: allKeyEvents.map((eventName) => ({
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: {
                      matchType: 'EXACT' as const,
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

    const result = {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };

    if (!response.rows || response.rows.length === 0) {
      return result;
    }

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const eventName = row.dimensionValues[0]?.value || '';
        const eventCount = Number(row.metricValues[0]?.value || 0);

        if (isYjRegistration(eventName)) {
          result.yjRegistrations += eventCount;
        } else if (isYjApplication(eventName)) {
          result.yjApplications += eventCount;
        } else if (isYdRegistration(eventName)) {
          result.ydRegistrations += eventCount;
        } else if (isYdApplication(eventName)) {
          result.ydApplications += eventCount;
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching funnel conversions by date range:', error);
    return {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };
  }
}

/**
 * Helper to build single source filter for GA4 queries
 */
function buildSingleSourceFilter(source: string) {
  const [sourceValue, mediumValue] = source.split(' / ');
  return {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: 'sessionSource',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: sourceValue,
            },
          },
        },
        {
          filter: {
            fieldName: 'sessionMedium',
            stringFilter: {
              matchType: 'EXACT' as const,
              value: mediumValue,
            },
          },
        },
      ],
    },
  };
}

/**
 * Get unique users by date range filtered by diagnosis sources (line / chatbot + line / bot)
 * 診断結果のURLクリックしたユニークユーザー数 = 診断→サイト遷移のファネル用
 * (歩留まり表ではセッション数ではなくユニークユーザー数を使用)
 */
export async function getDiagnosisFunnelSessionsByDateRange(startDate: string, endDate: string): Promise<number> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
      ],
      dimensionFilter: buildSourceFilter(DIAGNOSIS_FUNNEL_SOURCES),
    });

    if (!response.rows || response.rows.length === 0) {
      return 0;
    }

    return Number(response.rows[0]?.metricValues?.[0]?.value || 0);
  } catch (error) {
    console.error('Error fetching diagnosis funnel users:', error);
    return 0;
  }
}

/**
 * Get both sessions and unique users by date range filtered by diagnosis sources (line / chatbot + line / bot)
 * セッション数とユニークユーザー数の両方を取得
 */
export async function getDiagnosisFunnelMetricsByDateRange(
  startDate: string,
  endDate: string
): Promise<{ sessions: number; activeUsers: number }> {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      metrics: [
        {
          name: 'sessions',
        },
        {
          name: 'activeUsers',
        },
      ],
      dimensionFilter: buildSourceFilter(DIAGNOSIS_FUNNEL_SOURCES),
    });

    if (!response.rows || response.rows.length === 0) {
      return { sessions: 0, activeUsers: 0 };
    }

    return {
      sessions: Number(response.rows[0]?.metricValues?.[0]?.value || 0),
      activeUsers: Number(response.rows[0]?.metricValues?.[1]?.value || 0),
    };
  } catch (error) {
    console.error('Error fetching diagnosis funnel metrics:', error);
    return { sessions: 0, activeUsers: 0 };
  }
}

/**
 * Get metrics by funnel type (sessions, activeUsers, conversions)
 * 指定されたファネルタイプのセッション数、ユーザー数、CV数を取得
 */
export async function getFunnelMetricsByType(
  funnelType: FunnelType,
  startDate: string,
  endDate: string
): Promise<{
  sessions: number;
  activeUsers: number;
  yjRegistrations: number;
  yjApplications: number;
}> {
  try {
    const sources = FUNNEL_SOURCES[funnelType];
    const allKeyEvents = getAllKeyEvents();

    // ソースフィルターを構築（配列形式に対応）
    const sourceFilter = buildSourceFilter(sources);

    // 並列でメトリクスとCV数を取得
    const [metricsResponse, conversionsResponse] = await Promise.all([
      // セッション数とユーザー数
      analyticsDataClient.runReport({
        property: `properties/${GA4_CONFIG.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
        ],
        dimensionFilter: sourceFilter,
      }),
      // CV数
      analyticsDataClient.runReport({
        property: `properties/${GA4_CONFIG.propertyId}`,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              sourceFilter,
              {
                orGroup: {
                  expressions: allKeyEvents.map((eventName) => ({
                    filter: {
                      fieldName: 'eventName',
                      stringFilter: {
                        matchType: 'EXACT' as const,
                        value: eventName,
                      },
                    },
                  })),
                },
              },
            ],
          },
        },
      }),
    ]);

    const metrics = metricsResponse[0];
    const conversions = conversionsResponse[0];

    const result = {
      sessions: 0,
      activeUsers: 0,
      yjRegistrations: 0,
      yjApplications: 0,
    };

    // メトリクス結果
    if (metrics.rows && metrics.rows.length > 0) {
      result.sessions = Number(metrics.rows[0]?.metricValues?.[0]?.value || 0);
      result.activeUsers = Number(metrics.rows[0]?.metricValues?.[1]?.value || 0);
    }

    // CV結果
    if (conversions.rows) {
      conversions.rows.forEach((row) => {
        if (row.dimensionValues && row.metricValues) {
          const eventName = row.dimensionValues[0]?.value || '';
          const eventCount = Number(row.metricValues[0]?.value || 0);

          if (isYjRegistration(eventName)) {
            result.yjRegistrations += eventCount;
          } else if (isYjApplication(eventName)) {
            result.yjApplications += eventCount;
          }
          // YDは現在ファネルでは使用しないが、必要に応じて追加可能
        }
      });
    }

    return result;
  } catch (error) {
    console.error(`Error fetching funnel metrics for ${funnelType}:`, error);
    return {
      sessions: 0,
      activeUsers: 0,
      yjRegistrations: 0,
      yjApplications: 0,
    };
  }
}

/**
 * Get all funnel metrics for all types
 * 全ファネルタイプのメトリクスを一括取得
 */
export async function getAllFunnelMetricsByDateRange(
  startDate: string,
  endDate: string
): Promise<Record<FunnelType, {
  sessions: number;
  activeUsers: number;
  yjRegistrations: number;
  yjApplications: number;
}>> {
  const funnelTypes: FunnelType[] = ['diagnosis', 'menu', 'feature', 'message', 'autochat'];

  const results = await Promise.all(
    funnelTypes.map((type) => getFunnelMetricsByType(type, startDate, endDate))
  );

  return {
    diagnosis: results[0],
    menu: results[1],
    feature: results[2],
    message: results[3],
    autochat: results[4],
  };
}

/**
 * Get YJ/YD conversions by date range filtered by diagnosis sources (line / chatbot + line / bot)
 * 診断結果のURLからのCV
 */
export async function getDiagnosisFunnelConversionsByDateRange(
  startDate: string,
  endDate: string
): Promise<{
  yjRegistrations: number;
  yjApplications: number;
  ydRegistrations: number;
  ydApplications: number;
}> {
  try {
    const allKeyEvents = getAllKeyEvents();

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${GA4_CONFIG.propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        {
          name: 'eventName',
        },
      ],
      metrics: [
        {
          name: 'eventCount',
        },
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            buildSourceFilter(DIAGNOSIS_FUNNEL_SOURCES),
            {
              orGroup: {
                expressions: allKeyEvents.map((eventName) => ({
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: {
                      matchType: 'EXACT' as const,
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

    const result = {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };

    if (!response.rows || response.rows.length === 0) {
      return result;
    }

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const eventName = row.dimensionValues[0]?.value || '';
        const eventCount = Number(row.metricValues[0]?.value || 0);

        if (isYjRegistration(eventName)) {
          result.yjRegistrations += eventCount;
        } else if (isYjApplication(eventName)) {
          result.yjApplications += eventCount;
        } else if (isYdRegistration(eventName)) {
          result.ydRegistrations += eventCount;
        } else if (isYdApplication(eventName)) {
          result.ydApplications += eventCount;
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching diagnosis funnel conversions:', error);
    return {
      yjRegistrations: 0,
      yjApplications: 0,
      ydRegistrations: 0,
      ydApplications: 0,
    };
  }
}
