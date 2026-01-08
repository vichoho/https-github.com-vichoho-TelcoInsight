import { SignalingEvent } from '../types';

// Calculate distance between two points in km (Haversine Formula)
export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

// Douglas-Peucker Algorithm for Trajectory Smoothing
// Purpose: Reduce the number of points in a curve that is approximated by a series of points.
// Helps in "thinning" the dense signaling data while keeping the shape.
export const douglasPeucker = (points: SignalingEvent[], epsilon: number): SignalingEvent[] => {
  if (points.length <= 2) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (dmax > epsilon) {
    const recResults1 = douglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = douglasPeucker(points.slice(index), epsilon);

    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
};

// Calculate perpendicular distance from point p to line defined by p1 and p2
const perpendicularDistance = (p: SignalingEvent, p1: SignalingEvent, p2: SignalingEvent) => {
  let x = p.lng;
  let y = p.lat;
  let x1 = p1.lng;
  let y1 = p1.lat;
  let x2 = p2.lng;
  let y2 = p2.lat;

  // Area of triangle * 2 / base length
  const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

  if (denominator === 0) return 0;
  return numerator / denominator;
};
