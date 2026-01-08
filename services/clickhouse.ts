import { DailyImsiStats, ImsiCellUsage, DataSourceMode } from '../types';
import { calculateHealthScore } from '../utils/scoringUtils';
import { generateMockImsiTrend, generateMockProblemCells } from './dataService';

// --- Configuration ---
export const CH_CONFIG = {
  endpoint: 'http://localhost:8123', // In a real app, this would be your proxy or backend
  database: 'cem',
  user: 'readonly',
  password: 'password_placeholder'
};

// --- SQL Templates (From Engineering Specs) ---
export const CH_QUERIES = {
  imsiDailyKPI: (imsi: string, date: string) => `
    SELECT
        date, imsi, serving_cell_id,
        rrc_setup_sr, rrc_drop_rate, ho_fail_rate,
        avg_dl_tp, p95_dl_tp, latency_p95, pkt_loss
    FROM imsi_kpi_daily
    WHERE imsi = '${imsi}'
      AND date = '${date}';
  `,

  servingCellKPI: (cellId: string, date: string) => `
    SELECT
        cell_id, prb_dl_util, congestion_ratio, active_ue_avg
    FROM cell_kpi_daily
    WHERE cell_id = '${cellId}'
      AND date = '${date}';
  `,

  imsi7Days: (imsi: string, date: string) => `
    SELECT
        date, rrc_setup_sr, rrc_drop_rate, ho_fail_rate,
        avg_dl_tp, latency_p95, pkt_loss
    FROM imsi_kpi_daily
    WHERE imsi = '${imsi}'
      AND date BETWEEN subtractDays(toDate('${date}'), 6) AND toDate('${date}')
    ORDER BY date;
  `,

  imsiCellTopN: (imsi: string, date: string) => `
    SELECT
        cell_id,
        site_id,
        stay_ratio,
        prb_dl_util,
        avg_dl_tp,
        rrc_drop_rate,
        (
            stay_ratio * 0.4 +
            if(prb_dl_util > 80, 0.3, 0) +
            if(avg_dl_tp < 5, 0.2, 0) +
            if(rrc_drop_rate > 2, 0.1, 0)
        ) AS problem_score
    FROM
    (
        SELECT
            u.cell_id,
            c.site_id,
            u.stay_time_sec / u.total_time_sec AS stay_ratio,
            c.prb_dl_util,
            c.avg_dl_tp,
            c.rrc_drop_rate
        FROM imsi_cell_usage_daily u
        LEFT JOIN cell_kpi_daily c
            ON u.cell_id = c.cell_id
           AND u.date = c.date
        WHERE u.imsi = '${imsi}'
          AND u.date = '${date}'
    )
    ORDER BY problem_score DESC
    LIMIT 3;
  `
};

// --- Execution Engine ---

// Simulator for browser environment (since we can't really connect to localhost:8123 from here)
const simulateExecution = async <T>(sql: string, mockDataFallback: T): Promise<T> => {
  console.group('%c[ClickHouse Query Executor]', 'color: #0ea5e9; font-weight: bold;');
  console.log('%cGenerated SQL:', 'color: #cbd5e1; font-family: monospace;', `\n${sql.trim()}`);
  console.log('%cEndpoint:', 'color: #64748b;', `${CH_CONFIG.endpoint}?database=${CH_CONFIG.database}`);
  console.groupEnd();

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  // In a real app, we would fetch here.
  // const response = await fetch(CH_CONFIG.endpoint, { method: 'POST', body: sql ... });
  
  // Return mock data for the visual demo to continue working
  return mockDataFallback;
};

// --- Data Fetchers ---

export const getImsiTrendCH = async (imsi: string, date: Date): Promise<DailyImsiStats[]> => {
    const dateStr = date.toISOString().split('T')[0];
    const sql = CH_QUERIES.imsi7Days(imsi, dateStr);
    
    // Fallback to mock data logic for the demo, but generating real SQL
    const mockData = generateMockImsiTrend(imsi, date); 
    
    return simulateExecution(sql, mockData);
};

export const getProblemCellsCH = async (imsi: string, date: string): Promise<ImsiCellUsage[]> => {
    const sql = CH_QUERIES.imsiCellTopN(imsi, date);
    const mockData = generateMockProblemCells(imsi, date);
    return simulateExecution(sql, mockData);
};

export const getDailyStatsCH = async (imsi: string, date: string): Promise<DailyImsiStats | null> => {
    // This requires a chained query in a real app:
    // 1. Get IMSI KPI -> find serving_cell
    // 2. Get Cell KPI
    const sqlIMSI = CH_QUERIES.imsiDailyKPI(imsi, date);
    
    console.group('%c[ClickHouse Chained Query]', 'color: #a855f7; font-weight: bold;');
    console.log('Step 1: Fetch IMSI Daily KPI');
    console.log(sqlIMSI.trim());
    
    // Simulate finding a cell ID
    const mockCellId = 'C-20912'; 
    const sqlCell = CH_QUERIES.servingCellKPI(mockCellId, date);
    
    console.log('Step 2: Fetch Serving Cell Context');
    console.log(sqlCell.trim());
    console.groupEnd();

    await new Promise(resolve => setTimeout(resolve, 800));

    // Return the last day of the mock trend as the single day stats
    const trend = generateMockImsiTrend(imsi, new Date(date));
    return trend[trend.length - 1];
};