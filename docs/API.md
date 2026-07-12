# 🔌 PawDojo 資料層 / API 對照

App 對雲端（Supabase）的所有存取都集中在少數幾個檔案，這份文件是維護入口。
資料表結構的真相來源：[`docs/supabase/schema.sql`](./supabase/schema.sql)。

## 自動生成的 API 文件（類 Swagger）
Supabase 依 schema 自動產生 REST API 與文件，schema 一改就更新：
- **後台 API Docs**：`https://supabase.com/dashboard/project/kobqhuocvhfugenlyvli/api`
- **OpenAPI JSON**：`GET https://kobqhuocvhfugenlyvli.supabase.co/rest/v1/`（header 帶 `apikey`）
- 建議：用 `supabase gen types typescript --project-id kobqhuocvhfugenlyvli` 產生型別，讓 App 型別與資料庫同步。

## 客戶端檔案
| 檔案 | 職責 |
|---|---|
| `src/lib/supabase.ts` | 建立 Supabase client（URL + publishable key） |
| `src/lib/petsApi.ts` | 社群資料（pets/posts/comments/讚/追蹤/檢舉）CRUD |
| `src/lib/storage.ts` | 媒體上傳到 Storage、取公開網址 |
| `src/auth/authStore.ts` | Email 註冊/登入/登出、session |
| `src/permissions.ts` | 前端權限判斷（與 DB 的 RLS 對應） |
| `src/store/useStore.ts` | 全域狀態；社群動作呼叫上面 API 後 `syncSocial()` |

## petsApi 函式 ↔ 資料表 / 操作
| 函式 | 資料表 | 操作 | 備註 |
|---|---|---|---|
| `fetchSocial(userId)` | pets, posts, comments, post_likes, pet_follows, post_reports | select | 一次抓齊並套上該使用者的 讚/追蹤/檢舉 狀態 |
| `createPetRemote(input, userId)` | pets | insert | owned→owner_id；stray→reporter_id+caretaker_ids |
| `addPostRemote(...)` | posts | insert | 帶 author_id / author_name |
| `deletePostRemote(id)` | posts | delete | RLS：作者或 owner/caretaker |
| `addCommentRemote(...)` | comments | insert | |
| `deleteCommentRemote(id)` | comments | delete | RLS：作者或 owner/caretaker |
| `setLikeRemote(postId, userId, like)` | post_likes | insert/delete | 觸發器同步 `posts.likes` |
| `setFollowRemote(petId, userId, follow)` | pet_follows | insert/delete | 觸發器同步 `pets.followers` |
| `reportPostRemote(postId, userId)` | post_reports | insert | 觸發器同步 `report_count`，達 3 自動 `hidden` |
| `uploadMedia(localUri, userId)` | storage: `media` bucket | upload + getPublicUrl | 遠端網址直接沿用不重傳 |

## 權限（RLS）對照
DB 端 RLS 是真正的防線，前端 `src/permissions.ts` 只是先擋 UI。兩者規則一致：

| 動作 | owned | stray |
|---|---|---|
| 讀檔案 | public 皆可 / 私人限本人 | public 皆可 |
| 改檔案 | owner | reporter + caretakers |
| 新增紀錄 | owner | 任何登入者（共筆） |
| 刪紀錄 | 作者 或 owner | 作者 或 caretaker |
| 讚/追蹤/檢舉 | 任何登入者（自己一份） | 同左 |

## 資料表一覽
`profiles` · `pets` · `posts` · `comments` · `post_likes` · `pet_follows` · `post_reports`
（詳細欄位見 `schema.sql`。）

## 尚未上雲（仍本機）
道館 `gyms`、對戰 `battles`、參賽 `entries`、頭銜/戰績 —— 之後可比照 pets 遷移到 Supabase。
