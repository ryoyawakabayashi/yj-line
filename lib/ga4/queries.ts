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
    const sourceMap: Record<string, number> = {};

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const source = row.dimensionValues[0]?.value || '';
        const medium = row.dimensionValues[1]?.value || '';
        const conversions = Number(row.metricValues[0]?.value || 0);

        const sourceKey = `${source} / ${medium}`;

        // Only include LINE sources we're tracking
        if (LINE_SOURCES.includes(sourceKey as any)) {
          sourceMap[sourceKey] = (sourceMap[sourceKey] || 0) + conversions;
        }
      }
    });

    return Object.entries(sourceMap)
      .map(([source, conversions]) => ({
        source: SOURCE_LABELS[source] || source,
        conversions,
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
    const dailyMap: Record<string, { conversions: number; bySource: Record<string, number> }> = {};

    response.rows.forEach((row) => {
      if (row.dimensionValues && row.metricValues) {
        const date = row.dimensionValues[0]?.value || '';
        const source = row.dimensionValues[1]?.value || '';
        const medium = row.dimensionValues[2]?.value || '';
        const conversions = Number(row.metricValues[0]?.value || 0);

        const sourceKey = `${source} / ${medium}`;

        // Only include LINE sources we're tracking
        if (LINE_SOURCES.includes(sourceKey as any)) {
          if (!dailyMap[date]) {
            dailyMap[date] = { conversions: 0, bySource: {} };
          }

          const sourceLabel = SOURCE_LABELS[sourceKey] || sourceKey;
          dailyMap[date].conversions += conversions;
          dailyMap[date].bySource[sourceLabel] = (dailyMap[date].bySource[sourceLabel] || 0) + conversions;
        }
      }
    });

    return Object.entries(dailyMap)
      .map(([date, data]) => ({
        date: formatDate(date),
        conversions: data.conversions,
        bySource: data.bySource,
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
