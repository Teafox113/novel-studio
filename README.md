# Novel Studio

**讓手稿、人物、世界觀與研究資料，留在同一個創作空間。**

Novel Studio 是以繁體中文介面為主、本機使用的長篇小說編輯器。從場景卡片、人物設定到雙軸時間線，協助作者方便整理故事架構以及隨時參考查閱設定；需要專心寫作時，可以切換打字機模式，進行沉浸式碼字，也可以讓參考資料留在角落。

## 下載並安裝（一般使用者）

**目前版本：0.12.0 · Windows 10／11 x64**

### 推薦：下載安裝版

**[⬇ 下載 Windows 安裝版 EXE](https://github.com/Teafox113/novel-studio/releases/download/v0.12.0/Novel-Studio-0.12.0-Windows-x64-Setup.exe)**

1. 點上方連結，下載 `Novel-Studio-0.12.0-Windows-x64-Setup.exe`。
2. 開啟下載的檔案，依安裝畫面指示完成安裝。
3. 從 Windows 開始功能表開啟 **Novel Studio**，即可開始使用。

一般使用者不需要安裝 Node.js、Rust 或輸入指令，也不需要 GitHub 帳號。

### 不想安裝：下載免安裝版

**[⬇ 下載 Windows 免安裝 ZIP](https://github.com/Teafox113/novel-studio/releases/download/v0.12.0/Novel-Studio-0.12.0-Windows-x64-NoInstall.zip)**

下載後按右鍵選「解壓縮全部」，再進入解壓後的資料夾，開啟 `Novel-Studio.exe`。請完整解壓後再執行。

免安裝版需要 WebView2 Runtime；若電腦缺少此執行環境，可改用上方安裝版。**資料仍保存在 Windows 使用者目錄，不會跟著 ZIP 或 EXE 搬移**；安裝版與免安裝版共用本機資料，請勿同時開啟編輯。

[其他下載：MSI、更新紀錄與 SHA-256 校驗碼](https://github.com/Teafox113/novel-studio/releases/tag/v0.12.0) · [查看最新版本](https://github.com/Teafox113/novel-studio/releases/latest)

> 上方 GitHub 的「Code → Download ZIP」與 Releases 的「Source code」是原始碼。要直接使用軟體，請選本頁的 **安裝版 EXE** 或 **免安裝 ZIP**。

### 第一次開啟，要怎麼開始寫？

1. 首次開啟會看到「霧港十三夜」示範作品。
2. 點右上角 **「⋯」→「我的小說專案」**。
3. 輸入小說名稱與作者，按 **「新建空白小說」**。
4. 在「第一章」輸入正文，等右上角顯示 **「已儲存」**。

想專心寫作可按「打字機」，按 `Esc` 返回；想保留一份檔案，使用「⋯ → 匯出專案」保存 `.novel` 備份。

### 安裝與升級提醒

- 安裝程式目前尚未簽署數位簽章，Windows 可能顯示來源未驗證提示。請確認下載來源是本專案的 GitHub Releases。
- 升級前先匯出 `.novel` 備份並關閉舊版，再安裝新版。
- 搬到另一台電腦時，請將 `.novel` 檔帶過去，使用「匯入專案」開啟作品。

[📖 完整使用指南：下載、建立小說、備份與升級](docs/USER_GUIDE.md)

## 功能

| 創作需求 | 已有功能 |
| --- | --- |
| 寫作與編排 | 樹狀手稿、場景編輯、卡片牆、大綱表格、摘要、狀態與目標字數 |
| 沉浸寫作 | 暖色紙張、深色書房、游標行跟隨、Esc 返回、四角參考浮窗與收合 |
| 世界觀管理 | 人物、地點、勢力、物品、設定、專有名詞、別名、屬性與關係 |
| 架空歷史 | 自訂曆法、紀元、月份與週日，虛構日期排序及場景／世界觀連結 |
| 故事時間線 | 分開管理故事發生順序與閱讀順序，連結場景與人物 |
| 靈感與研究 | 隨手記事、Tag、網址、筆記、圖片與 PDF 附件、快速貼上或拖入 |
| 搜尋 | 跨手稿與資料庫搜尋，支援詞組、`#Tag`、`type:人物` 與快速跳轉 |
| 專案管理 | 新建空白小說、開啟本機作品、另存獨立副本、切換前安全快照 |
| 備份 | 自動備份、手動快照、還原前安全備份、備份與目前版本欄位比較 |
| 專案交換 | 匯入／匯出 `.novel`，在瀏覽器與 Windows 之間手動搬移 |
| 書稿輸出 | DOCX、EPUB 3、HTML、UTF-8 文字，以及系統列印為 PDF |
| 本機審核 | 摘要與事實候選、缺漏與一致性提示、來源引文、接受／略過紀錄 |

目前的「AI 協作」是本機預設接入口，尚未串接大型語言模型或雲端問答。

[完整使用指南：下載、免安裝、建立小說、備份與升級](docs/USER_GUIDE.md)

## 資料保存與搬移

- 瀏覽器模式使用目前瀏覽器、目前來源網址的 localStorage；清除網站資料會影響手稿與備份。
- Windows 桌面模式使用本機 SQLite。
- 小說與內嵌附件不會因為開啟本機審核而傳送到模型服務；自行開啟外部來源連結會連線到該網站。
- 請定期透過「專案與備份」匯出 `.novel`，另存到自己的備份位置。
- `.novel` 包含專案內容及附件，請勿把私人小說放進公開儲存庫。
- 目前沒有帳號或即時雲端同步；跨電腦需手動交換專案。

## 使用提示

- `Ctrl+K`：全專案搜尋。
- `Ctrl+Shift+R`：研究浮窗。
- 選取場景後按「打字機」：進入專注模式；`Esc` 返回。
- 備份列表的「比較」：檢查備份到目前內容的新增、刪除與欄位修改。

## 尚在規劃

- 作品刪除、直接綁定檔案與更多作品庫整理方式。
- 逐字差異標色、單一場景還原與選擇性合併。
- 人物關係圖、自訂書稿輸出範本。
- PDF 全文擷取、OCR 與頁碼引用。
- 可選語言模型供應器、行動伴侶與跨裝置同步。

參考浮窗目前是四角定位，尚無任意拖曳及多份文件並排。版本比較目前為欄位級對照。中文實體輸入法、桌面 PDF 預覽與不同裝置仍需要更多實機驗證。

## 文件與回饋

- [架空歷史與曆法設定](docs/FICTIONAL_HISTORY.md)

- [開發路線圖](docs/ROADMAP.md)
- [打字機模式](docs/TYPEWRITER_MODE.md)
- [專案架構](docs/ARCHITECTURE.md)
- [專案搜尋](docs/PROJECT_SEARCH.md)
- [研究浮窗與快速收集](docs/QUICK_CAPTURE_AND_RESEARCH_PEEK.md)
- [書稿匯出](docs/COMPILE_EXPORT.md)
- [本機審核](docs/AI_REVIEW.md)

歡迎透過 GitHub Issues 回報問題或提出構想，請附上重現步驟、作業系統與使用模式。範例請使用虛構或去識別內容，避免附上私人稿件。

## 開發者專區

以下內容適合想修改原始碼或自行建置的開發者。一般使用者使用上方下載連結即可。

<details>
<summary>展開開發環境、建置指令與專案結構</summary>

以 React、TypeScript、Tiptap 與 Tauri 2 建立，提供瀏覽器開發模式與 Windows 桌面應用程式。

### 開發環境與本機啟動

需要 Node.js 22 或更新的相容 LTS 版本，以及 npm。

```bash
git clone https://github.com/Teafox113/novel-studio.git
cd novel-studio
npm ci
npm run dev
```

依終端機顯示的網址開啟瀏覽器；預設為 `http://127.0.0.1:4173/`。首次使用會載入虛構示範專案「霧港十三夜」。

```bash
npm test          # 執行 Vitest 測試
npm run build     # TypeScript 檢查與正式網頁建置
npm run preview   # 預覽建置結果
```

SQLite schema 檢查另需 Python 3：

```bash
npm run test:schema
```

### 自行建置 Windows 桌面版

需要 Windows、Rust（MSVC 工具鏈）、Microsoft C++ Build Tools、Windows SDK 與 WebView2 Runtime。安裝前置工具後，在專案目錄執行：

```powershell
npm ci
npm run desktop:dev
# 或建立安裝程式
npm run desktop:build
```

建置腳本會尋找 Visual Studio C++ 工具，以及 `CARGO_HOME` 或目前使用者的 `.cargo` 目錄。安裝包輸出至 `src-tauri/target/release/bundle/`。

目前桌面發布以 Windows 為主；儲存庫中的其他平台圖示不代表已支援該平台。

### 專案結構

```text
src/components/   React 介面與編輯器
src/domain/       資料模型、遷移與版本比較
src/storage/      瀏覽器與 SQLite 儲存
src/ai/           本機審核
src/compile/      書稿組裝與輸出
src-tauri/        Windows 原生殼、權限及資料庫 migration
scripts/          建置輔助與 schema 驗證
docs/             功能說明與路線圖
```

</details>

## 授權

目前尚未指定開源授權，公開原始碼不等於授予任意使用、修改或再散布的許可。若有再利用需求，請先聯絡專案維護者。第三方依賴依各自授權條款使用。
