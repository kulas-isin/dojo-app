// 平台實作於 imageVariant.web.ts / imageVariant.native.ts，由 Metro 依平台挑選。
export declare function makeVariant(uri: string, maxW: number, quality: number): Promise<Blob>;
