export interface TrackerData {
  domain: string;
  count: number;
  category: string;
  blocked: boolean;
}

export interface PrivacyPolicyAnalysis {
  score: number;
  risks: string[];
  summary: string;
  safety?: 'SAFE' | 'RISKY' | 'UNSAFE';
  dataSharing: string[];
  industryType?: string;
  positiveFeatures?: string[];
  analysisDepth?: string;
  lastAnalyzed?: string;
}

export interface DataFlowNode {
  id: string;
  domain: string;
  type: 'source' | 'tracker' | 'destination';
  position: { x: number; y: number };
}

export interface DataFlowEdge {
  from: string;
  to: string;
  dataType: string;
}

export interface SiteData {
  url: string;
  trustScore: number;
  trackers: TrackerData[];
  privacyAnalysis?: PrivacyPolicyAnalysis;
  dataFlow: {
    nodes: DataFlowNode[];
    edges: DataFlowEdge[];
  };
}
