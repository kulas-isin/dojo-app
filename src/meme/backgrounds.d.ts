// 平台實作於 backgrounds.web.ts / backgrounds.native.ts。
// 程序化畫的迷因背景（原創、非仿製特定迷因圖）。
export declare function drawBurst(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void;

/** 產生一張純背景的 dataURL 供預覽用；原生回傳空字串 */
export declare function burstBgDataUrl(size?: number): string;
