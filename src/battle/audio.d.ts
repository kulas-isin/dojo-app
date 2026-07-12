// 平台實作於 audio.web.ts / audio.native.ts，由 Metro 依平台挑選。
export function unlock(): void;
export function setMuted(m: boolean): void;
export function moveSfx(fx: string, tier?: number): void;
export function chargeSfx(): void;
export function hitSfx(): void;
export function superSfx(): void;
export function startBgm(): void;
export function stopBgm(): void;
export function startSting(): void;
export function winJingle(): void;
export function loseJingle(): void;
