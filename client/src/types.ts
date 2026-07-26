/** A single object detected by the COCO-SSD model on the server. */
export interface DetectedObject {
  /** [x, y, width, height] in source-video pixel coordinates. */
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

export interface DetectResponse {
  success: boolean;
  objects: DetectedObject[];
}

export interface StatusResponse {
  server: string;
  aiModelReady: boolean;
}

/** Lifecycle of the connection to the detection backend. */
export type ServerStatus =
  | { kind: 'connecting' }
  | { kind: 'warming-up' }
  | { kind: 'ready' }
  | { kind: 'offline' };

export const serverStatusLabel = (status: ServerStatus): string => {
  switch (status.kind) {
    case 'connecting':
      return 'Checking server connection...';
    case 'warming-up':
      return 'Server found. AI model is warming up...';
    case 'ready':
      return 'Online & Tracking';
    case 'offline':
      return 'Server offline';
  }
};
