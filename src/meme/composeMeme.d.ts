// 平台實作於 composeMeme.web.ts / composeMeme.native.ts，由 Metro 依平台挑選。
export type MemeStyle = 'classic' | 'topbar';

export interface MemeInput {
  imageUri: string;
  topText: string;
  bottomText: string;
  style: MemeStyle;
}

export interface MemeResult {
  /** 可直接下載或丟給 uploadMedia 的圖片資料 */
  dataUrl: string;
  blob: Blob;
}

export declare function composeMeme(input: MemeInput): Promise<MemeResult>;
