# Schema v6

Schema v6 新增研究素材到靈感的關聯：

```ts
interface ResearchItem {
  linkedInspirationIds: string[];
}
```

這個方向刻意讓附件仍由 `ResearchItem` 擁有；靈感只持有反向關聯，不複製圖片、PDF 或
文件的 Data URL。舊 schema v1–v5 專案會在載入時補上空陣列並升級為 v6。

SQLite migration `0006_quick_capture.sql` 新增 `research_inspiration_links`，供後續將完整
Project JSON 拆成正規化資料表時使用。目前正式資料來源仍是 `app_projects.project_json`。
