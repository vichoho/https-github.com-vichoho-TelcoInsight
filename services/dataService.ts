import { DailyImsiStats, ImsiCellUsage, SignalingEvent, AreaHistoricalData, DataSourceMode } from '../types';
import { calculateHealthScore } from '../utils/scoringUtils';
import { getDistanceFromLatLonInKm } from '../utils/geoUtils';
import * as chService from './clickhouse';

// --- State Management ---
let currentDataSource: DataSourceMode = 'mock';

export const setDataSource = (mode: DataSourceMode) => {
  currentDataSource = mode;
  console.log(`[DataService] Switched to ${mode.toUpperCase()} mode.`);
};

export const getDataSource = () => currentDataSource;

// --- Helper Utils ---
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndF = (min: number, max: number) => Math.random() * (max - min) + min;

// --- MOCK Data Generators (Internal) ---

const generateMockImsiTrend = (imsi: string, endDate: Date): DailyImsiStats[] => {
  const trend: DailyImsiStats[] = [];
  const lastDigit = parseInt(imsi.slice(-1)) || 0;
  const isChronicIssue = lastDigit % 3 === 0;
  const isTransientIssue = lastDigit % 3 === 1;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    let baseLoad = 40;
    if (isChronicIssue) baseLoad = 85;
    if (isTransientIssue && (i === 1 || i === 2)) baseLoad = 95;

    const loadFactor = baseLoad / 100;
    
    const stats: DailyImsiStats = {
      date: dateStr,
      imsi,
      healthScore: 0,
      servingCellPrb: Math.min(100, rndF(baseLoad - 10, baseLoad + 10)),
      servingCellCongestion: loadFactor > 0.8 ? rndF(5, 20) : rndF(0, 2),
      activeUeDensity: loadFactor * 100 + rnd(0, 20),
      rrcSetupSr: loadFactor > 0.9 ? rndF(90, 98) : rndF(99, 100),
      rrcDropRate: loadFactor > 0.85 ? rndF(2, 8) : rndF(0, 1),
      hoFailRate: rndF(0, 5),
      avgDlTp: Math.max(0.5, (1 - loadFactor) * 50 + rndF(-5, 5)),
      p95DlTp: Math.max(1, (1 - loadFactor) * 100 + rndF(-10, 10)),
      latencyP95: 30 + (loadFactor * 100) + rnd(0, 20),
      pktLoss: loadFactor > 0.9 ? rndF(1, 5) : rndF(0, 0.5),
    };

    const breakdown = calculateHealthScore(stats);
    stats.healthScore = breakdown.totalScore;
    trend.push(stats);
  }
  return trend;
};

const generateMockProblemCells = (imsi: string, date: string): ImsiCellUsage[] => {
  const cellCount = rnd(3, 6);
  const cells: ImsiCellUsage[] = [];
  let remainingTime = 86400;

  for (let i = 0; i < cellCount; i++) {
    const stay = i === cellCount - 1 ? remainingTime : rnd(1800, remainingTime / 2);
    remainingTime -= stay;
    if (remainingTime < 0) remainingTime = 0;

    const isBadCell = i === 0 && (parseInt(imsi.slice(-1)) % 3 !== 2);
    const prb = isBadCell ? rndF(85, 99) : rndF(20, 60);
    const tp = isBadCell ? rndF(1, 4) : rndF(20, 80);
    const drop = isBadCell ? rndF(3, 8) : rndF(0, 0.5);

    let pType: 'Load' | 'Coverage' | 'Quality' | 'None' = 'None';
    if (prb > 80) pType = 'Load';
    else if (drop > 3) pType = 'Coverage';
    else if (tp < 5) pType = 'Quality';

    cells.push({
      cellId: `C-${rnd(10000, 99999)}`,
      siteId: `S-${rnd(100, 999)}`,
      stayTimeSec: stay,
      totalTimeSec: 86400,
      stayRatio: stay / 86400,
      prbDlUtil: prb,
      avgDlTp: tp,
      rrcDropRate: drop,
      problemScore: 0,
      problemType: pType
    });
  }

  return cells.map(c => ({
    ...c,
    problemScore: (c.stayRatio * 0.4) + (c.prbDlUtil > 80 ? 0.3 : 0) + (c.avgDlTp < 5 ? 0.2 : 0) + (c.rrcDropRate > 2 ? 0.1 : 0)
  })).sort((a, b) => b.problemScore - a.problemScore);
};

// --- PUBLIC API (Async Wrappers) ---

export const getImsiTrend = async (imsi: string, endDate: Date): Promise<DailyImsiStats[]> => {
  if (currentDataSource === 'clickhouse') {
    return chService.getImsiTrendCH(imsi, endDate);
  }
  // Mock Mode
  return new Promise(resolve => {
    setTimeout(() => resolve(generateMockImsiTrend(imsi, endDate)), 400);
  });
};

export const getProblemCells = async (imsi: string, date: string): Promise<ImsiCellUsage[]> => {
  if (currentDataSource === 'clickhouse') {
    return chService.getProblemCellsCH(imsi, date);
  }
  return new Promise(resolve => {
    setTimeout(() => resolve(generateMockProblemCells(imsi, date)), 400);
  });
};

export const getImsiGeoTrace = async (imsi: string, date: string): Promise<SignalingEvent[]> => {
  // Geo trace usually comes from a separate trace server, keeping as mock for now even in CH mode
  // or you could add a CH query for lat/lon logs if available.
  const events: SignalingEvent[] = [];
  let lat = 25.033964;
  let lng = 121.564472;
  const startTime = new Date(`${date}T08:00:00`).getTime();
  let currentTime = startTime;

  for (let i = 0; i < 50; i++) {
    const isOutlier = i === 15 || i === 35;
    let newLat = lat;
    let newLng = lng;

    if (isOutlier) { newLat += 0.05; newLng += 0.05; } 
    else { newLat += rndF(-0.002, 0.003); newLng += rndF(-0.002, 0.003); }

    const timeDiffMinutes = rnd(2, 10);
    currentTime += timeDiffMinutes * 60 * 1000;

    let speed = 0;
    if (i > 0) {
      const prev = events[i - 1];
      const distKm = getDistanceFromLatLonInKm(prev.lat, prev.lng, newLat, newLng);
      const timeHours = (currentTime - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60);
      speed = timeHours > 0 ? distKm / timeHours : 0;
    }

    const isSpeedOutlier = speed > 200;
    let eventType: SignalingEvent['eventType'] = 'Periodic Update';
    const r = Math.random();
    if (r < 0.1) eventType = 'Call Setup';
    else if (r < 0.2) eventType = 'Call Drop';
    else if (r < 0.4) eventType = 'Handover';
    else if (r < 0.5) eventType = 'Location Update';

    let rsrp = -90 + rnd(-20, 15);
    if (eventType === 'Call Drop') rsrp = rnd(-115, -125);
    if (isOutlier) rsrp = -140;

    events.push({
      timestamp: new Date(currentTime).toISOString(),
      lat: newLat,
      lng: newLng,
      eventType,
      speedKmH: speed,
      isOutlier: isSpeedOutlier || (isOutlier && speed > 50),
      rsrp
    });

    if (!isOutlier) { lat = newLat; lng = newLng; }
  }

  return new Promise(resolve => setTimeout(() => resolve(events), 300));
};

export const getAreaTrend = async (areaId: string): Promise<AreaHistoricalData[]> => {
  // Area data mock
  const data: AreaHistoricalData[] = [];
  for (let i = 0; i <= 24; i++) {
    const hour = i;
    const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
    const timeFactor = Math.sin((hour - 14) * Math.PI / 12); 
    const baseLoad = 50 + (timeFactor * 30);
    const noise = rndF(-5, 5);
    let prbUtil = Math.max(0, Math.min(100, baseLoad + noise));
    const activeUsers = Math.floor(prbUtil * 200 + rnd(500, 1000));
    const throughput = Math.max(5, 80 - (prbUtil * 0.6) + rndF(-5, 5));
    let availability = 99.99 - (prbUtil > 85 ? rndF(0, 0.1) : 0);
    
    const scoreAvail = availability > 99.9 ? 100 : availability > 99.5 ? 80 : 40;
    const scorePerf = throughput > 40 ? 100 : throughput > 15 ? 80 : 40;
    const scoreCap = prbUtil < 60 ? 100 : prbUtil < 85 ? 80 : 50;
    const healthScore = (scoreAvail * 0.3) + (scorePerf * 0.4) + (scoreCap * 0.3);

    data.push({ hour: hourLabel, healthScore, prbUtil, activeUsers, throughput, availability });
  }
  return new Promise(resolve => setTimeout(() => resolve(data), 500));
};

// Export synchronous internal generators ONLY if needed directly (e.g. initial state), 
// but preferred to use async wrappers.
export { generateMockImsiTrend, generateMockProblemCells };