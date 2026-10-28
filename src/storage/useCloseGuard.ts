import { useEffect, useRef } from "react";
import { isTauriRuntime } from "./createProjectRepository";

export function useCloseGuard(unsaved: boolean, backupPending: boolean) {
  const state = useRef({ unsaved, backupPending }); state.current = { unsaved, backupPending };
  useEffect(() => {
    let disposed = false, asking = false;
    let unlisten: (() => void) | undefined;
    const unload = (e: BeforeUnloadEvent) => {
      if (state.current.unsaved || state.current.backupPending) { e.preventDefault(); e.returnValue = ""; }
    };
    if (!isTauriRuntime()) window.addEventListener("beforeunload", unload);
    else void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      const stop = await win.onCloseRequested(async event => {
        if (!state.current.unsaved && !state.current.backupPending) return;
        event.preventDefault();
        if (asking) return;
        asking = true;
        try {
          const { confirm } = await import("@tauri-apps/plugin-dialog");
          const yes = await confirm(state.current.unsaved ? "作品尚未完成儲存。建議取消並等候『已儲存』，直接離開可能遺失變更。仍要離開嗎？" : "已選資料夾還有備份未完成。可取消並到資料夾備份按『立即備份』；仍要離開嗎？", { title: "離開 Novel Studio", kind: "warning", okLabel: "仍要離開", cancelLabel: "返回編輯" });
          if (yes) await win.destroy();
        } finally { asking = false; }
      });
      if (disposed) stop(); else unlisten = stop;
    }).catch(console.error);
    return () => { disposed = true; unlisten?.(); window.removeEventListener("beforeunload", unload); };
  }, []);
}
