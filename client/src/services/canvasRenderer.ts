import type { DetectedObject } from '../types';

const BOX_COLOR = '#00FFFF';
const LABEL_TEXT_COLOR = '#000000';
const BOX_LINE_WIDTH = 4;
const LABEL_HEIGHT = 24;
const LABEL_PADDING = 4;

export const clearCanvas = (canvas: HTMLCanvasElement | null): void => {
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

/**
 * Draws one labelled rectangle per detection. Boxes arrive in source-video
 * pixels, so the canvas is scaled to match the video's intrinsic size.
 */
export const drawDetections = (
  canvas: HTMLCanvasElement | null,
  detections: DetectedObject[],
): void => {
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '16px sans-serif';
  ctx.textBaseline = 'top';

  for (const { bbox, class: label, score } of detections) {
    const [x, y, width, height] = bbox;
    const text = `${label} (${Math.round(score * 100)}%)`;

    ctx.strokeStyle = BOX_COLOR;
    ctx.lineWidth = BOX_LINE_WIDTH;
    ctx.strokeRect(x, y, width, height);

    const textWidth = ctx.measureText(text).width;
    // Keep the label inside the canvas when the box hugs the top edge.
    const labelY = y > LABEL_HEIGHT ? y - LABEL_HEIGHT : y;

    ctx.fillStyle = BOX_COLOR;
    ctx.fillRect(x, labelY, textWidth + LABEL_PADDING * 2, LABEL_HEIGHT);

    ctx.fillStyle = LABEL_TEXT_COLOR;
    ctx.fillText(text, x + LABEL_PADDING, labelY + LABEL_PADDING);
  }
};
