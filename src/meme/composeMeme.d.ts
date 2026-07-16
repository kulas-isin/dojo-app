// 平台實作於 composeMeme.web.ts / composeMeme.native.ts，由 Metro 依平台挑選。
export type TemplateKind =
  | 'classic' // 經典上下白字黑框
  | 'topbar' // 上白條
  | 'reaction' // 當…的時候（頂部深色帶白字）
  | 'bubble' // 內心 OS 對話框
  | 'label' // 標籤梗（箭頭指標籤）
  | 'vs' // 期待 vs 現實（雙圖）
  | 'drake' // 我不要／我要（雙圖）
  | 'burst'; // 彩虹光爆背景＋頂部字幕（羽化融入）

export type FilterKind =
  | 'none'
  | 'fried' // 炸圖 deep-fried
  | 'cry' // 哭哭藍調
  | 'soft' // 憨笑暖調
  | 'cursed' // 驚嚇 cursed
  | 'pixel'; // 像素化 8-bit

export interface MemeInput {
  template: TemplateKind;
  /** 1 或 2 張圖，依模板而定 */
  images: string[];
  /** 依模板 slots 順序對應的文字 */
  texts: string[];
  /** 迷因濾鏡（處理來源照片），預設 none */
  filter?: FilterKind;
  /** 濾鏡強度 0~1，預設 0.8 */
  filterStrength?: number;
}

export interface MemeResult {
  /** 可直接下載或丟給 uploadMedia 的圖片資料 */
  dataUrl: string;
  blob: Blob;
}

export declare function composeMeme(input: MemeInput): Promise<MemeResult>;
