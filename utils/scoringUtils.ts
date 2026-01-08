import { DailyImsiStats, HealthScoreBreakdown, ImsiCellUsage } from '../types';
import { THRESHOLDS, WEIGHTS } from '../constants';

// Helper: Normalize value to 0-100 score based on thresholds
// isHigherBetter: true for TP, false for Drop Rate
const normalizeScore = (val: number, warn: number, crit: number, isHigherBetter: boolean): number => {
  let score = 100;

  if (isHigherBetter) {
    // E.g. TP: Crit(3) < Warn(10). Val = 5.
    if (val >= warn) return 100;
    if (val <= crit) return 0;
    // Linear interpolation between crit and warn
    score = ((val - crit) / (warn - crit)) * 100;
  } else {
    // E.g. Drop: Warn(2) < Crit(5). Val = 3.
    if (val <= warn) return 100;
    if (val >= crit) return 0;
    score = ((crit - val) / (crit - warn)) * 100;
  }
  return Math.max(0, Math.min(100, score));
};

export const calculateHealthScore = (stats: DailyImsiStats): HealthScoreBreakdown => {
  // 1. Connectivity Score (30%)
  const s_rrc = normalizeScore(stats.rrcSetupSr, THRESHOLDS.RRC_SETUP_SR.WARN, THRESHOLDS.RRC_SETUP_SR.CRIT, true);
  const s_drop = normalizeScore(stats.rrcDropRate, THRESHOLDS.RRC_DROP_RATE.WARN, THRESHOLDS.RRC_DROP_RATE.CRIT, false);
  const s_ho = normalizeScore(stats.hoFailRate, THRESHOLDS.HO_FAIL_RATE.WARN, THRESHOLDS.HO_FAIL_RATE.CRIT, false);
  
  const connScore = (s_rrc * WEIGHTS.CONN_RRC_SETUP) + (s_drop * WEIGHTS.CONN_RRC_DROP) + (s_ho * WEIGHTS.CONN_HO_FAIL);

  // 2. Experience Score (40%)
  const s_tp_avg = normalizeScore(stats.avgDlTp, THRESHOLDS.DL_TP_AVG.WARN, THRESHOLDS.DL_TP_AVG.CRIT, true);
  const s_tp_p95 = normalizeScore(stats.p95DlTp, THRESHOLDS.DL_TP_P95.WARN, THRESHOLDS.DL_TP_P95.CRIT, true);
  const s_lat = normalizeScore(stats.latencyP95, THRESHOLDS.LATENCY.WARN, THRESHOLDS.LATENCY.CRIT, false);
  const s_pkt = normalizeScore(stats.pktLoss, THRESHOLDS.PKT_LOSS.WARN, THRESHOLDS.PKT_LOSS.CRIT, false);

  const expScore = (s_tp_avg * WEIGHTS.EXP_TP_AVG) + (s_tp_p95 * WEIGHTS.EXP_TP_P95) + (s_lat * WEIGHTS.EXP_LATENCY) + (s_pkt * WEIGHTS.EXP_PKT_LOSS);

  // 3. Radio Score (30%)
  const s_prb = normalizeScore(stats.servingCellPrb, THRESHOLDS.PRB_UTIL.WARN, THRESHOLDS.PRB_UTIL.CRIT, false);
  const s_cong = normalizeScore(stats.servingCellCongestion, THRESHOLDS.CONGESTION.WARN, THRESHOLDS.CONGESTION.CRIT, false);
  // Active UE density is contextual, using simplified linear mapping 0-100 users
  const s_ue = Math.max(0, 100 - (stats.activeUeDensity / 2)); 

  const radioScore = (s_prb * WEIGHTS.RAD_PRB) + (s_cong * WEIGHTS.RAD_CONG) + (s_ue * WEIGHTS.RAD_UE);

  // Total
  const total = (connScore * WEIGHTS.CONNECTIVITY) + (expScore * WEIGHTS.EXPERIENCE) + (radioScore * WEIGHTS.RADIO);

  // Identify Detractors (Top 3 factors pulling score down)
  const factors = [
    { name: 'RRC Setup', score: s_rrc },
    { name: 'RRC Drop', score: s_drop },
    { name: 'HO Fail', score: s_ho },
    { name: 'DL Throughput', score: s_tp_avg },
    { name: 'Latency', score: s_lat },
    { name: 'Packet Loss', score: s_pkt },
    { name: 'Radio Load (PRB)', score: s_prb },
    { name: 'Congestion', score: s_cong },
  ];
  
  const topDetractors = factors
    .filter(f => f.score < 80) // Only count if actually bad
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(f => f.name);

  return {
    connectivityScore: Math.round(connScore),
    experienceScore: Math.round(expScore),
    radioScore: Math.round(radioScore),
    totalScore: Math.round(total),
    topDetractors
  };
};

export const calculateCellProblemScore = (cell: ImsiCellUsage): number => {
  // Logic from prompt: StayRatio * 0.4 + (PRB>80?0.3) + (TP<5?0.2) + (Drop>2?0.1)
  let score = cell.stayRatio * 0.4; // Base score on time spent
  
  if (cell.prbDlUtil > 80) score += 0.3;
  if (cell.avgDlTp < 5) score += 0.2;
  if (cell.rrcDropRate > 2) score += 0.1;

  // Normalize roughly to 0-1 for sorting
  return score;
};