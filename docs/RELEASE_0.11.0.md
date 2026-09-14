# Novel Studio 0.11.0 — 多小說專案管理

發布日期：2026-09-14。Windows x64。

## 更新

- 我的小說專案：新建空白小說、開啟本機作品、目前作品另存獨立副本。
- 切換前保存與安全快照；瀏覽器原有單一作品會保留到作品庫。
- 取消瀏覽器匯入檔案時解除忙碌狀態。
- 更新版本資訊，新增完整使用指南。
- 同步提供 EXE、MSI、免安裝 ZIP 與 SHA-256 校驗碼。

## 下載選擇

一般使用者選 Setup.exe；需要 MSI 部署選 .msi；不想安裝主程式選 NoInstall.zip，完整解壓後執行 Novel-Studio.exe。

免安裝版依賴 WebView2 Runtime，資料仍保存在 Windows 使用者目錄，與安裝版共用資料。不要同時開啟兩版編輯。搬機請使用 .novel 匯出／匯入。

更新前請先匯出 .novel 備份。安裝包目前沒有數位簽章。

## 驗證與限制

50 項自動測試及 SQLite schema 驗證通過，完成 Windows 原生建置。尚未完成乾淨 Windows 環境安裝與圖形操作驗收。

作品管理不包含直接綁定檔案自動寫回、刪除作品、跨裝置同步。瀏覽器保存大量素材可能超出容量，建議使用 Windows 版。

[完整使用指南](https://github.com/Teafox113/novel-studio/blob/main/docs/USER_GUIDE.md)
