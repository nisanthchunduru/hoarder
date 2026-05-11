import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createLinkIfNotExists } from "./actions";
import { deleteLink } from "./db-actions";

declare const chrome: any;
declare const browser: any;
const ext: any =
  typeof chrome !== "undefined" && chrome.tabs ? chrome :
  typeof browser !== "undefined" && browser.tabs ? browser :
  // Dev fallback when opened via `npm run dev` at /popup.html
  {
    tabs: {
      query: async () => {
        const url = new URLSearchParams(location.search).get("url")
          ?? "https://example.com/article-to-save";
        return [{ url }];
      },
      create: ({ url }: { url: string }) => window.open(url, "_blank"),
    },
    runtime: { getURL: (p: string) => "/" + p.replace(/^\//, "") },
  };

type State =
  | { kind: "loading" }
  | { kind: "saved"; url: string; id: number; duplicate: boolean }
  | { kind: "removed"; url: string }
  | { kind: "error"; message: string };

function Popup() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const tabs = await ext.tabs.query({ active: true, currentWindow: true });
        const url: string | undefined = tabs?.[0]?.url;
        if (!url || !/^https?:/i.test(url)) {
          setState({ kind: "error", message: "Can't save this page" });
          return;
        }
        const link = await createLinkIfNotExists(url);
        setState({ kind: "saved", url, id: link.id!, duplicate: !!link._duplicate });
      } catch (e: any) {
        setState({ kind: "error", message: e?.message ?? "Failed to save" });
      }
    })();
  }, []);

  const openApp = () => {
    ext.tabs.create({ url: ext.runtime.getURL("index.html") });
    window.close();
  };

  const remove = async () => {
    if (state.kind !== "saved") return;
    await deleteLink(state.id);
    setState({ kind: "removed", url: state.url });
  };

  return (
    <>
      <h1>Hoarder</h1>
      {state.kind === "loading" && (
        <div className="loading">
          <div className="spinner" />
          <span className="loading-text">Saving…</span>
        </div>
      )}
      {state.kind === "saved" && (
        <>
          <div className="success-card">
            <div className="check-icon">
              <svg viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L5 9L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="success-text">Saved!</div>
              <div className="success-url">{state.url}</div>
            </div>
          </div>
          <div className="actions">
            <button className="btn-primary" onClick={openApp}>Open Hoarder</button>
            <button className="btn-secondary" onClick={remove}>Remove</button>
          </div>
        </>
      )}
      {state.kind === "removed" && (
        <>
          <div className="status">Removed</div>
          <div className="url">{state.url}</div>
          <div className="actions">
            <button className="btn-primary" onClick={openApp}>Open Hoarder</button>
          </div>
        </>
      )}
      {state.kind === "error" && (
        <>
          <div className="status err">{state.message}</div>
          <div className="actions">
            <button className="btn-primary" onClick={openApp}>Open Hoarder</button>
          </div>
        </>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
