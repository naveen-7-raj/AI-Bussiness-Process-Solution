import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://127.0.0.1:8000/api/ws';
const MAX_EVENTS = 20;
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 10000;

/**
 * useWebSocket – shared auto-reconnecting WebSocket hook.
 *
 * Returns:
 *   events       – array of the latest MAX_EVENTS payloads (newest first)
 *   connected    – boolean live connection status
 *   clearEvents  – function to wipe the events list
 */
export function useWebSocket() {
    const [events, setEvents] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const reconnectDelay = useRef(RECONNECT_DELAY_MS);
    const unmounted = useRef(false);

    const connect = useCallback(() => {
        if (unmounted.current) return;

        try {
            const ws = new WebSocket(WS_URL);
            socketRef.current = ws;

            ws.onopen = () => {
                if (unmounted.current) { ws.close(); return; }
                setConnected(true);
                reconnectDelay.current = RECONNECT_DELAY_MS; // reset back-off
                console.log('[WS] Connected');
            };

            ws.onmessage = (evt) => {
                if (unmounted.current) return;
                try {
                    const payload = JSON.parse(evt.data);
                    setEvents(prev => [payload, ...prev].slice(0, MAX_EVENTS));
                    setTotalCount(prev => prev + 1);
                } catch (err) {
                    console.warn('[WS] Parse error:', err);
                }
            };

            ws.onclose = () => {
                if (unmounted.current) return;
                setConnected(false);
                console.log(`[WS] Disconnected. Reconnecting in ${reconnectDelay.current}ms…`);
                setTimeout(() => {
                    reconnectDelay.current = Math.min(
                        reconnectDelay.current * 1.5,
                        MAX_RECONNECT_DELAY_MS
                    );
                    connect();
                }, reconnectDelay.current);
            };

            ws.onerror = (err) => {
                console.warn('[WS] Error:', err);
                ws.close(); // triggers onclose → reconnect
            };
        } catch (err) {
            console.error('[WS] Failed to create socket:', err);
            setTimeout(connect, reconnectDelay.current);
        }
    }, []);

    useEffect(() => {
        unmounted.current = false;
        connect();
        return () => {
            unmounted.current = true;
            socketRef.current?.close();
        };
    }, [connect]);

    const clearEvents = useCallback(() => {
        setEvents([]);
        setTotalCount(0);
    }, []);

    return { events, totalCount, connected, clearEvents };
}
