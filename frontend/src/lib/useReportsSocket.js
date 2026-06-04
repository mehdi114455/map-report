import { useEffect, useRef } from "react";
import { auth } from "../firebase";

const WS_URL = import.meta.env.VITE_API_BASE_URL.replace(/^http/, "ws") + "/ws/reports";

/**
 * Live report status updates
 * Auto-reconnects with exponential backoff on disconnect
 */
export function useReportsSocket(onMessage) {
  const wsRef = useRef(null);
  const cbRef = useRef(onMessage);
  const retryRef = useRef(0);
  const aliveRef = useRef(true);

  // Always call the latest callback without re-opening the socket on rerender.
  useEffect(() => {
    cbRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    aliveRef.current = true;

    async function connect() {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => { retryRef.current = 0; };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          cbRef.current?.(msg);
        } catch {}
      };
      ws.onclose = () => {
        if (!aliveRef.current) return;
        const delay = Math.min(30000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      aliveRef.current = false;
      wsRef.current?.close();
    };
  }, []);
}