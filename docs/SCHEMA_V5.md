# Novel Studio schema v5

schema v5 新增 `AiFinding`，保存分析結果與作者審核決定。

| 欄位 | 用途 |
|---|---|
| `fingerprint` | 根據問題類型及來源產生的穩定識別，避免重複提示 |
| `kind` | 摘要、人物事實、一致性、本文提及或資料缺漏 |
| `status` | 待審核、已接受或已略過 |
| `severity` | 建議、注意或矛盾 |
| `targetType` / `targetId` | 場景、人物、時間事件或整個專案 |
| `evidence` | 來源場景 ID 與短引文 |
| `action` | 經作者核准後可執行的受限動作 |
| `detectedAt` / `reviewedAt` | 分析與人工決定時間 |

舊 schema v1～v4 專案會自動加入空的 `aiFindings` 陣列，不會在遷移時自動掃描或
改寫資料。只有作者進入 AI 協作中心並主動開始分析後，才會產生候選。
