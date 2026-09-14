# Novel Studio 0.12.0 — 架空歷史一覽

發布日期：2026-09-14。Windows x64。

## 更新

- 左側新增「架空歷史一覽」，依虛構年月日整理歷史。
- 可設定曆法名稱、紀元、月份名稱與天數、每週日名。
- 支援紀元前年份，事件排序與週日計算不使用零年。
- 共用既有時間事件，連結場景與世界觀；保留原閱讀順序。
- 修改曆法時阻擋無效日期；未編年事件保持可見。
- schema v7 保存曆法與編年，支援快照比較、專案副本與匯入匯出。
- 修正匯出 .novel 的 appVersion，改為使用實際程式版本。

## 下載與升級

一般使用者選 Setup.exe，需要 MSI 部署選 .msi；免安裝選 NoInstall.zip，完整解壓後執行 Novel-Studio.exe。免安裝版需 WebView2 Runtime，資料仍保存在 Windows 使用者目錄，與安裝版共用，請勿同時編輯。

更新前先匯出 .novel 備份。新版 schema v7 請使用 0.12.0 或更新版本開啟；勿用舊版覆寫含曆法的作品。安裝包尚未簽署數位簽章。

## 驗證與限制

54 項自動測試及 SQLite schema 驗證通過，完成 Windows 原生建置。尚未完成新介面圖形操作與乾淨 Windows 安裝驗收。

第一版使用單一曆法、固定月長，不包含閏年、多曆法換算或區間事件。事件距離不是等比例時間尺；表單編輯後需按儲存。

[架空歷史使用說明](https://github.com/Teafox113/novel-studio/blob/main/docs/FICTIONAL_HISTORY.md)
