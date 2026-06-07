# 🍄 皮克敏探索紀錄

記錄打菇座標、花點明信片兌換地點，以及交換明信片蒐藏。

## 功能

- 🗺️ **地圖總覽** — 互動地圖顯示所有打菇與花點地點
- 🍄 **打菇紀錄** — 記錄座標、日期、照片
- 💮 **花點明信片** — 花瓣兌換地點、照片、花瓣數
- 📬 **交換明信片** — 不需座標，純照片上傳
- 匯出 / 匯入 JSON 備份

## 架設到 GitHub Pages

1. 在 GitHub 建立新 repository（例：`pikmin-tracker`）
2. 把這三個檔案上傳到 repository 根目錄：
   - `index.html`
   - `style.css`
   - `app.js`
3. 到 repository **Settings → Pages**
4. Source 選 **Deploy from a branch**，Branch 選 **main**，資料夾選 **/ (root)**
5. 點 Save，等約 1 分鐘
6. 網址會是 `https://你的帳號.github.io/pikmin-tracker/`

## 注意事項

- 資料存在瀏覽器 localStorage，換裝置需手動匯出/匯入 JSON
- 照片以 base64 存入，圖片數量多時 localStorage 可能接近上限（約 5MB）
- 建議定期用「匯出備份 JSON」功能備份資料
