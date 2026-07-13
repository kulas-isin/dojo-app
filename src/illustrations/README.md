# 插畫模組（可抽換）

這裡集中放 App 的**裝飾插畫**。設計原則：

- **寵物照片維持用戶真實上傳**，插畫只用在 UI 裝飾（標頭色塊、塗鴉、空狀態）。
- 全部是純向量（`react-native-svg`），**方便日後整批替換**成你自己畫的或開源素材。

## 現有元件
- `Doodle` — 手繪塗鴉（paw / heart / sparkle / star / squiggle）。
- `Blob` — 有機色塊，四種形狀變化。
- `EmptyState` — 色塊 + 塗鴉 + 文案的空狀態。

## 換成你自己的插畫
1. **向量（推薦）**：把 SVG 轉成 `react-native-svg` 元件（用 [react-svgr](https://react-svgr.com/) 貼上 SVG 產生程式碼），放這個資料夾，沿用同樣的 props 介面即可。
2. **點陣圖（PNG）**：放到 `assets/illustrations/`，用 `<Image source={require('...')} />` 呈現。

## 接開源插畫集
可用的免費/開源來源（注意各自授權）：
- **unDraw**（MIT-like，免署名）— SVG，適合空狀態與情境插圖。
- **Open Doodles**（CC0）— 手繪塗鴉風。
- **Blush**（部分免費）— 可組合角色插畫。
- **Streamline / Iconscout Illustrations**（部分免費）。

流程：下載 SVG → 用 SVGR 轉成元件（或存成 PNG 用 Image）→ 放這裡 → 在畫面引用。
只要沿用 `Doodle`/`EmptyState` 的 props，就能整批替換而不動畫面程式碼。
