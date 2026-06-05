import { useEffect, useRef } from "react";
import { auth } from "../firebase";

const WS_URL = import.meta.env.VITE_API_BASE_URL.replace(/^http/, "ws") + "/ws/reports";

/**
 * Subscribe to live report status updates.
 */
export function useReportsSocket(onMessage) {
  const cbRef = useRef(onMessage);

  useEffect(() => {
    cbRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let ws = null;
    let retryTimer = null;
    let retries = 0;
    let cancelled = false;

    async function connect() {
      if (cancelled) return;
      const user = auth.currentUser;
      if (!user) {
        // Try again in a after a while
        retryTimer = setTimeout(connect, 500);
        return;
      }

      let token;
      try {
        token = await user.getIdToken();
      } catch {
        retryTimer = setTimeout(connect, 2000);
        return;
      }


      if (cancelled) return;

      ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

      ws.onopen = () => { retries = 0; };

      ws.onmessage = (e) => {
        try {
          cbRef.current?.(JSON.parse(e.data));
        } catch {}
      };

      ws.onclose = () => {
        if (cancelled) return;
        // Exponential backoff: 1s, 2s, 4s, 8s, capped at 30s.
        const delay = Math.min(30000, 1000 * 2 ** retries);
        retries += 1;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (ws && ws.readyState <= 1) ws.close();
    };
  }, []);
}