export type DataSourceMode = 'mock' | 'clickhouse';

export enum QualityStatus {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export interface KpiDefinition {
  id: string;
  name: string;
  unit: string;
  value: number;
  thresholdWarning: number;
  thresholdCritical: number;
  isHigherBetter: boolean;
  category: 'RAN' | 'Connectivity' | 'QoE';
}

export interface CellData {
  cellId: string;
  siteId: string;
  prbDlUtil: number; // %
  congestionRatio: number; // %
  activeUeAvg: number;
  avgDlTp: number; // Mbps
  rrcDropRate: number; // %
}

export interface ImsiCellUsage {
  cellId: string;
  stayTimeSec: number;
  totalTimeSec: number;
  stayRatio: number;
  // Joined Cell Data
  siteId: string;
  prbDlUtil: number;
  avgDlTp: number;
  rrcDropRate: number;
  problemScore: number;
  problemType: 'Load' | 'Coverage' | 'Quality' | 'None';
}

export interface DailyImsiStats {
  date: string;
  imsi: string;
  healthScore: number;
  
  // KPI Raw Values
  rrcSetupSr: number;
  rrcDropRate: number;
  hoFailRate: number;
  avgDlTp: number;
  p95DlTp: number;
  latencyP95: number;
  pktLoss: number;
  
  // Radio Context
  servingCellPrb: number;
  servingCellCongestion: number;
  activeUeDensity: number;
}

export interface HealthScoreBreakdown {
  connectivityScore: number; // 30%
  experienceScore: number;   // 40%
  radioScore: number;        // 30%
  totalScore: number;
  topDetractors: string[];   // KPI names
}

// Geospatial Types
export interface SignalingEvent {
  timestamp: string; // ISO string
  lat: number;
  lng: number;
  eventType: 'Call Setup' | 'Handover' | 'Location Update' | 'Call Drop' | 'Periodic Update';
  speedKmH: number; // Calculated speed from previous point
  isOutlier: boolean; // If speed > 200km/h
  rsrp: number; // Signal Strength in dBm
}

export interface AreaHistoricalData {
  hour: string;
  healthScore: number; // 0-100
  prbUtil: number;
  activeUsers: number;
  throughput: number;
  availability: number; // 99.xxx%
}