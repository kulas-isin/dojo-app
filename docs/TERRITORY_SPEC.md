# PawDojo 地盤佔領・實作規格（定稿）

真實地圖 + H3 六角格圖層的「佔地為王」系統。互動 mockup 已確認視覺方向。

## 拍板決策
| # | 決策 | 選擇 |
|---|---|---|
| 1 | 格子大小 | **H3 res 8**（邊長 ~0.46km，走過去佔的尺度）|
| 2 | 圖磚 | **OSM**（免費起步，之後可換 Mapbox 美化）|
| 3 | 道館 vs 地盤 | **C 混合**：地盤為主圖層，原道館座標＝**戰略地標格**（高收益）|
| 4 | 收益 | **有 depth**：普通 +3／地標 +8／連片每格 +2；佔領後保護 3 小時 |

## 視覺方向（mockup 定案）
- **地圖是主角**：OSM 圖磚**去飽和成灰中性底** → 只有玩家/地盤顏色鮮豔、不撞色（Pokémon GO 作法）
- **地盤輕量呈現**：淡色塊（透明度 ~0.22，地標 0.3）＋**駐守毛孩的像素 sprite 站在格子上巡邏走動**＋小旗標屬主
- **道館保留像素風**：像素小廟 ⛩️ sprite ＋ 守門毛孩
- **你的像素寵物**站在地圖上、GPS 範圍圈、脈動、待機晃動 → 遛狗探索感
- **佔領動畫**：毛孩「啵」地蹦下來插旗 ＋ 星火四散 ＋「佔領! +N/時」
- 六角格線極淡、選中才描邊；卡片/按鈕走圓潤糖果風但不厚重

## 技術
- **`h3-js` v4**（已裝）：`latLngToCell` / `cellToBoundary` / `gridDisk` / `gridDistance` / `polygonToCells`
- 只畫**可視範圍**格子（bounds → polygonToCells，上限 400）；只存**被佔領**格子
- Web 用 `react-leaflet`＋OSM 圖磚，每格 `<Polygon>` overlay；Native 用 `react-native-maps` `<Polygon>`
- 佔領一律走 **SECURITY DEFINER RPC**（伺服器驗證寵物歸屬＋保護狀態），前端不直接寫表

## 已完成（批次 1・基礎層）
- `src/territory/types.ts`：Territory 型別
- `src/territory/h3grid.ts`：res 8 網格工具（cellAt / cellCorners / cellsInBounds / inCaptureRange / isAdjacent…）
- `src/territory/income.ts`：depth 收益模型 ＋ 由 gyms 算地標格
- `docs/supabase/territory.sql`：territories 表 ＋ `capture_territory` / `garrison_territory` RPC ＋ RLS
- `src/lib/territoriesApi.ts`：fetch / capture / garrison

## 待做批次
2. **地圖 UI**：territory 分頁，OSM 地圖＋去飽和＋hex overlay＋可視格渲染＋你的位置/範圍（先做 web）
3. **佔領流程**：點格 → 資訊卡 → GPS 範圍判定 → 接現有回合制對戰 → 打贏呼叫 capture RPC ＋ 蹦出動畫
4. **收益接經濟**：持有格數×收益累積進 cans（比照 collectIdle）＋ 地主排行
5. **像素毛孩上圖 + 巡邏/佔領動畫**（native 實機測試）
6. 之後：連片國界線、地標加成調校、防 GPS 作弊、被搶推播、賽季

## 資料模型
```
territories(h3 PK, owner_id, owner_name, pet_id, pet_name, pet_type, thumb_url, captured_at, shield_until)
```
地標 = 前端由 `gyms` 座標 `cellAt()` 換算的 H3 集合（不進表）。

## 風險
- **原生地圖 + GPS 實機行為**是最大變數，需真手機測試
- cans 目前存本機（AsyncStorage、不跨裝置）；地盤收益先在本機用雲端格數×時間計算，跨裝置需另把 cans 上雲
