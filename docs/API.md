# 🔌 PawDojo API 參考

App 對雲端（Supabase）的完整資料契約。真相來源：[`schema.sql`](./supabase/schema.sql)。
Supabase 也會依 schema 自動生成 OpenAPI：後台 `.../project/kobqhuocvhfugenlyvli/api`，
或 `GET https://kobqhuocvhfugenlyvli.supabase.co/rest/v1/`（帶 `apikey`）。

---

## 1. 連線與認證

所有請求（REST / Auth / Storage）都要帶：

| Header | 值 | 說明 |
|---|---|---|
| `apikey` | publishable key | 專案識別，前端可公開 |
| `Authorization` | `Bearer <access_token>` | 登入者 JWT；未登入時帶 publishable key（匿名） |

> App 端用 `supabase-js`（`src/lib/supabase.ts`）自動帶這些 header，不用手動處理。
> REST base：`https://kobqhuocvhfugenlyvli.supabase.co/rest/v1/<table>`

---

## 2. 資料表欄位規格

圖例：**PK** 主鍵 · **FK** 外鍵 · **NN** 不可為空 · *(trigger)* 由觸發器維護、**請勿直接寫**。

### `profiles`（使用者公開資料）
| 欄位 | 型別 | 可空 | 預設 | 約束 / 說明 |
|---|---|---|---|---|
| id | uuid | NN | — | **PK**, **FK** → auth.users（=登入者 id） |
| name | text | NN | `'訓練家'` | 註冊時由觸發器帶入暱稱 |
| created_at | timestamptz | NN | now() | |

### `pets`（寵物檔案）
| 欄位 | 型別 | 可空 | 預設 | 約束 / 說明 |
|---|---|---|---|---|
| id | uuid | NN | gen_random_uuid() | **PK** |
| kind | text | NN | — | check ∈ `owned` / `stray` |
| name | text | NN | — | |
| pet_type | text | NN | — | check ∈ `cat` / `dog` / `other` |
| avatar_url | text | NN | — | **需為公開 URL**（先經 Storage 上傳） |
| bio | text | NN | `''` | |
| visibility | text | NN | `'public'` | check ∈ `public` / `private` |
| followers | int | NN | 0 | *(trigger)* 由 `pet_follows` 計數 |
| owner_id | uuid | 可 | null | **FK** → auth.users；**owned 專用** |
| reporter_id | uuid | 可 | null | **FK** → auth.users；**stray 專用** |
| caretaker_ids | uuid[] | NN | `{}` | 照顧者 id 陣列（stray） |
| status | text | 可 | null | check ∈ `intact`/`neutered`/`adoptable`/`adopted`；stray 用 |
| area | text | 可 | null | 出沒地點；stray 用 |
| created_at | timestamptz | NN | now() | |

### `posts`（貼文/紀錄）
| 欄位 | 型別 | 可空 | 預設 | 約束 / 說明 |
|---|---|---|---|---|
| id | uuid | NN | gen_random_uuid() | **PK** |
| pet_id | uuid | NN | — | **FK** → pets（**ON DELETE CASCADE**） |
| author_id | uuid | 可 | null | **FK** → auth.users（cascade）；示範資料可為 null |
| author_name | text | NN | `'訓練家'` | 冗餘存作者名，免 join |
| media_url | text | NN | — | **需為公開 URL** |
| media_type | text | NN | `'photo'` | check ∈ `photo` / `video` |
| caption | text | NN | `''` | |
| likes | int | NN | 0 | *(trigger)* 由 `post_likes` 計數 |
| report_count | int | NN | 0 | *(trigger)* 由 `post_reports` 計數 |
| hidden | boolean | NN | false | *(trigger)* 檢舉 ≥3 自動 true |
| created_at | timestamptz | NN | now() | |

### `comments`（留言）
| 欄位 | 型別 | 可空 | 預設 | 約束 |
|---|---|---|---|---|
| id | uuid | NN | gen_random_uuid() | **PK** |
| post_id | uuid | NN | — | **FK** → posts（cascade） |
| author_id | uuid | 可 | null | **FK** → auth.users（cascade） |
| author_name | text | NN | `'訓練家'` | |
| text | text | NN | — | |
| created_at | timestamptz | NN | now() | |

### `post_likes` / `pet_follows` / `post_reports`（關聯，一人一份）
| 表 | 欄位 | 約束 |
|---|---|---|
| post_likes | post_id, user_id | **PK(post_id,user_id)**；兩者皆 FK cascade |
| pet_follows | pet_id, user_id | **PK(pet_id,user_id)** |
| post_reports | post_id, user_id | **PK(post_id,user_id)** |

> 讚/追蹤/檢舉都是「插一列＝加、刪一列＝減」，計數由觸發器同步回 `posts`/`pets`。

---

## 3. 串接規則（寫入時必守）

1. **kind 決定欄位**：
   - `owned` → 設 `owner_id = auth.uid()`；`reporter_id/status/area` 留 null、`caretaker_ids={}`。
   - `stray` → 設 `reporter_id = auth.uid()`、`caretaker_ids` 含自己、給 `status/area`；`owner_id` 留 null。
2. **計數欄位別手寫**：`followers/likes/report_count/hidden` 一律經 `pet_follows/post_likes/post_reports` 增刪，觸發器會算。
3. **author_id 必須等於 `auth.uid()`**（RLS `with check` 會擋）。
4. **媒體先上傳**：`avatar_url/media_url` 必須是公開 URL → 先 `uploadMedia()` 到 Storage 再寫入。
5. **刪除連動**：刪 pet → 其 posts/comments 連帶刪；刪 post → 其 comments/likes/reports 連帶刪。

---

## 4. RLS 權限（DB 端真正的防線）

| 表 | select | insert | update | delete |
|---|---|---|---|---|
| profiles | 全部 | 限自己(id=uid) | 限自己 | — |
| pets | public 或 owner/reporter/caretaker | 登入且 owner/reporter=uid | owner/reporter/caretaker | —（用 cascade） |
| posts | 未隱藏且該 pet 可見；或作者本人 | author=uid 且（stray 或 owned 本人） | —（僅觸發器 definer） | 作者 或 owner/caretaker |
| comments | 全部 | author=uid | — | 作者 或 owner/caretaker |
| post_likes / pet_follows | 自己(user=uid) | 自己 | — | 自己 |
| post_reports | 讀自己 | 自己 | — | — |
| storage `media` | 全部可讀 | 限登入者上傳 | — | — |

> 前端 `src/permissions.ts` 只是先擋 UI，最終以上述 RLS 為準（兩者規則一致）。

---

## 5. REST 呼叫範例（PostgREST）

```http
# 讀公開貼文（新到舊）
GET /rest/v1/posts?select=*&order=created_at.desc
apikey: <key>

# 依 pet 篩選
GET /rest/v1/posts?pet_id=eq.<uuid>&select=*

# 新增留言（回傳新列）
POST /rest/v1/comments
apikey: <key>
Authorization: Bearer <jwt>
Prefer: return=representation
{ "post_id":"<uuid>", "author_id":"<uid>", "author_name":"小明", "text":"好可愛" }

# 按讚（= 插一列；重複會 409）
POST /rest/v1/post_likes
{ "post_id":"<uuid>", "user_id":"<uid>" }

# 取消讚
DELETE /rest/v1/post_likes?post_id=eq.<uuid>&user_id=eq.<uid>
```

篩選運算子：`eq / neq / gt / lt / in / is`（如 `?status=eq.adoptable`）。
App 端一律透過 `supabase-js`，不需手拼這些。

---

## 6. 錯誤代碼對照

### REST / Postgres（PostgREST 回傳）
| HTTP | code | 意義 | 常見原因 |
|---|---|---|---|
| 401 | — | 未授權 | 缺/錯 apikey 或 JWT 過期 |
| 403 | `42501` | RLS 擋下 | insert/update/delete 不符 policy（如未登入發文、非本人刪文） |
| 409 | `23505` | 主鍵重複 | 重複按讚/追蹤/檢舉（PK 衝突） |
| 400 | `23503` | 外鍵不存在 | pet_id/post_id 指向不存在的列 |
| 400 | `23514` | check 違反 | kind/pet_type/visibility/status/media_type 值不合法 |
| 400 | `23502` | not-null 違反 | 少了必填欄位 |
| 406/400 | `PGRST116` | `.single()` 取不到列 | 查詢結果不是剛好一列 |

### Auth（GoTrue）
| HTTP | 訊息 / code | 意義 |
|---|---|---|
| 400 | `invalid_credentials` | 帳號或密碼錯 |
| 422 | `user_already_exists` | Email 已註冊 |
| 422 | `weak_password` | 密碼太短（<6） |
| 429 | `over_email_send_rate_limit` | 寄信超速 → 關閉 email 驗證即可 |
| 401 | token 失效 | session 過期，需重新登入 |

### Storage
| HTTP | 意義 | 原因 |
|---|---|---|
| 400 | Bucket not found | `media` 桶未建立 |
| 403 | RLS 擋下 | 未登入上傳 |
| 409 | 已存在 | 相同路徑且 `upsert:false` |
| 413 | 檔案過大 | 超過桶大小上限 |

---

## 7. 客戶端函式（`src/lib/*`）

回傳/丟錯慣例：**讀寫函式在遇到 Supabase error 時 `throw`**（呼叫端請 try/catch）。
`setLikeRemote / setFollowRemote / reportPostRemote` 目前**忽略錯誤**（樂觀更新，重複操作的 409 視為無害）。

| 函式 | 參數 | 回傳 | 對應表/操作 |
|---|---|---|---|
| `fetchSocial(userId \| null)` | 使用者 id | `{pets, posts, comments, reportedPosts}` | 讀 6 張表並套上個人狀態 |
| `createPetRemote(input, userId)` | 見 `CreatePetRemote` | `Promise<string>`（新 id） | insert pets |
| `addPostRemote(petId, userId, authorName, mediaUri, mediaType, caption)` | — | `Promise<void>` | insert posts |
| `deletePostRemote(postId)` | — | `Promise<void>` | delete posts |
| `addCommentRemote(postId, userId, authorName, text)` | — | `Promise<void>` | insert comments |
| `deleteCommentRemote(commentId)` | — | `Promise<void>` | delete comments |
| `setLikeRemote(postId, userId, like)` | like=true 加/false 減 | `Promise<void>` | insert/delete post_likes |
| `setFollowRemote(petId, userId, follow)` | — | `Promise<void>` | insert/delete pet_follows |
| `reportPostRemote(postId, userId)` | — | `Promise<void>` | insert post_reports |
| `uploadMedia(localUri, userId)` | 本機或遠端 URI | `Promise<string>`（公開 URL） | Storage upload；遠端 URL 原樣回傳 |

型別對應（DB snake_case ↔ App camelCase）集中在 `petsApi.ts` 的 `mapPet/mapPost/mapComment`。
`created_at`（ISO 字串）→ `createdAt`（毫秒），寫入時反向。

---

## 8. 尚未上雲（仍本機 zustand）
道館 `gyms`、對戰 `battles`、參賽 `entries`、頭銜/戰績。未來比照 pets 遷移即可。
