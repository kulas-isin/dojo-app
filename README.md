# 🐾 PawDojo — 寵物道館對戰

邊遛狗、邊散步，邊玩的娛樂 App。在地圖上建立**道館**，上傳家裡貓貓狗狗的照片或影片去**挑戰衛冕者**，靠大家**投票**決勝負，贏家登上王座、拿下**頭銜**，影片推上**排行榜**。

> Expo (React Native) 打造，本輪為**可跑的 MVP 雛形**：資料先存在裝置本機（AsyncStorage），尚未接真正的後端帳號與雲端儲存。

## 玩法

1. **地圖** 🗺️：看到附近的道館，點圖釘進去；長按地圖空白處（Web 是點空白處）可在該位置**建立新道館**。
2. **道館** 🏯：看現任**衛冕者**、進行中的**對戰投票**、以及道館內排行。
3. **挑戰** ⚔️：上傳毛孩照片/影片 → 若道館已有衛冕者，會和它配成一場對戰；沒有的話直接登頂。
4. **投票**：每人每場對戰投一票，票多者勝。按「結算對戰」決定新衛冕者。
5. **獎勵**：贏家獲得「XX 道館 衛冕者 👑」頭銜（在「我的」頁收藏），作品累積票數衝上**全域排行榜** 🏆。

## 怎麼測試

### 方法 A：手機實機（最完整，有真地圖 / 相機 / GPS）
1. 手機安裝 **Expo Go**（App Store / Google Play）。
2. 在專案根目錄執行：
   ```bash
   npm install
   npx expo start
   ```
3. 用 Expo Go 掃描終端機顯示的 QR Code。
   - 手機要和電腦在**同一個 Wi-Fi**；若不行，改用 `npx expo start --tunnel`。

### 方法 B：瀏覽器（最快，不用手機）
```bash
npm install
npm run web
```
打開 http://localhost:8081 。Web 上沒有原生地圖，會顯示一個可互動的**示意地圖**（點圖釘進道館、點空白處選位置），其餘流程（建立道館、上傳、投票、排行榜、頭銜）都能玩。

> 想驗證能不能打包，可跑 `npx expo export -p web`（離線即可）。

### 型別檢查
```bash
npm run typecheck
```

## 專案結構

```
app/                      # 畫面（Expo Router，檔案即路由）
  _layout.tsx             # 根 Stack
  (tabs)/                 # 底部分頁：地圖 / 排行榜 / 我的
  gym/[id].tsx            # 道館頁（衛冕者、對戰投票、排行）
  gym/create.tsx          # 建立道館
  gym/challenge.tsx       # 上傳毛孩、發起挑戰
src/
  store/useStore.ts       # Zustand 狀態（道館 / 作品 / 對戰 / 投票 / 頭銜）
  components/GymMap.*      # 地圖：.native 用 react-native-maps，.web 用示意地圖
  data/seed.ts            # 示範資料（台北周邊三座道館）
  types.ts theme.ts       # 型別與主題
```

## 之後可以接的東西（尚未實作）

- 真正的後端與帳號登入、雲端影片儲存（目前是本機示範資料）
- 對戰時間到自動結算、推播通知
- 更多挑戰玩法（才藝、變裝、計時賽等）、好友與留言
- Android 真機地圖需要設定 Google Maps API Key
