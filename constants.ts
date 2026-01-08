import { KpiDefinition } from './types';

// Engineering Thresholds
export const THRESHOLDS = {
  RRC_SETUP_SR: { WARN: 98, CRIT: 95 }, // Lower is bad
  RRC_DROP_RATE: { WARN: 2, CRIT: 5 },  // Higher is bad
  HO_FAIL_RATE: { WARN: 5, CRIT: 10 },  // Higher is bad
  
  DL_TP_AVG: { WARN: 10, CRIT: 3 },     // Lower is bad (Mbps)
  DL_TP_P95: { WARN: 20, CRIT: 5 },     // Lower is bad
  LATENCY: { WARN: 50, CRIT: 100 },     // Higher is bad (ms)
  PKT_LOSS: { WARN: 1, CRIT: 3 },       // Higher is bad (%)

  PRB_UTIL: { WARN: 70, CRIT: 90 },     // Higher is bad
  CONGESTION: { WARN: 5, CRIT: 15 },    // Higher is bad
};

// Weights for Health Score
export const WEIGHTS = {
  CONNECTIVITY: 0.3,
  EXPERIENCE: 0.4,
  RADIO: 0.3,
  
  // Sub-weights
  CONN_RRC_SETUP: 0.5, // 15% total
  CONN_RRC_DROP: 0.33, // 10% total
  CONN_HO_FAIL: 0.17,  // 5% total

  EXP_TP_AVG: 0.375,   // 15% total
  EXP_TP_P95: 0.25,    // 10% total
  EXP_LATENCY: 0.25,   // 10% total
  EXP_PKT_LOSS: 0.125, // 5% total

  RAD_PRB: 0.5,        // 15% total
  RAD_CONG: 0.33,      // 10% total
  RAD_UE: 0.17         // 5% total
};

export const MOCK_AREAS = ['Taipei_Xinyi', 'NewTaipei_Banqiao', 'Taichung_Xitun', 'Kaohsiung_Zuoying'];

export const SCORE_COLOR_MAP = (score: number) => {
  if (score >= 90) return '#22c55e'; // Green 500
  if (score >= 70) return '#eab308'; // Yellow 500
  return '#ef4444'; // Red 500
};
