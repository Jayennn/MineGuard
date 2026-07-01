export interface Worker {
  id: string;
  name: string;
  department: string;
  position: string;
  status: 'Active' | 'Inactive';
  photoUrl: string;
}

export interface Camera {
  id: string;
  location: string;
  violations24h: number;
  detected24h: number;
  status: 'Online' | 'Offline';
}

export interface ViolationMetric {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LocationMetric {
  rank: number;
  site: string;
  severity: 'Critical' | 'Medium' | 'Low';
  cases: number;
  percentage: number;
}

export interface ShiftMetric {
  shift: string;
  timeRange: string;
  cases: number;
  percentage: number;
}

export interface Snapshot {
  timestamp: string;
  camera: string;
  location: string;
  workerId: string;
  violation: string;
  imageUrl: string;
}
