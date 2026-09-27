/**
 * NEXORA AI-BPI — Centralized API & WebSocket Configuration
 *
 * Single source of truth for all backend communications:
 * - Local Development: uses Vite reverse-proxy or VITE_API_URL
 * - Cloud / Deployed Environment: connects to the production FastAPI backend on Render
 * - Explicit Override: VITE_API_URL and VITE_WS_URL environment variables always take precedence
 */

const PRODUCTION_BACKEND_URL = 'https://ai-bussiness-process-solution.onrender.com';

function isLocalhost() {
    if (typeof window === 'undefined') return true;
    const hostname = window.location.hostname;
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]' ||
        hostname === '0.0.0.0'
    );
}

export function getApiBaseUrl() {
    const envUrl = import.meta.env.VITE_API_URL;
    // 1. Explicit environment variable override
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('your-backend-host')) {
        return envUrl.trim().replace(/\/+$/, '');
    }

    // 2. In deployed production environment (e.g. Vercel), default to the deployed Render backend
    if (!isLocalhost()) {
        return PRODUCTION_BACKEND_URL;
    }

    // 3. In local development:
    // If local Vite proxy is active or if accessing via localhost, return empty string for proxy,
    // or LOCAL_BACKEND_URL if direct cross-port fetch is desired.
    return '';
}

export function getWebSocketUrl() {
    const envWs = import.meta.env.VITE_WS_URL;
    if (envWs && typeof envWs === 'string' && envWs.trim() && !envWs.includes('your-backend-host')) {
        return envWs.trim().replace(/\/+$/, '');
    }

    const base = getApiBaseUrl();
    if (base && /^https?:\/\//i.test(base)) {
        const wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
        return `${wsBase}/api/ws`;
    }

    // Default to the deployed production WebSocket gateway
    return 'wss://ai-bussiness-process-solution.onrender.com/api/ws';
}

export const API_BASE = getApiBaseUrl();
export const WS_URL = getWebSocketUrl();

export default {
    API_BASE,
    WS_URL,
    getApiBaseUrl,
    getWebSocketUrl,
};
