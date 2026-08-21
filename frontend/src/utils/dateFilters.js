export const filterByTimeRange = (timestamp, range) => {
    if (range === 'all') return true;
    if (!timestamp) return false;
    const time = new Date(timestamp).getTime();
    if (isNaN(time)) return false;

    const now = new Date();
    if (range === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return time >= startOfToday;
    }

    const daysMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '365d': 365,
    };
    const days = daysMap[range] || 7;
    const cutoff = now.getTime() - (days * 24 * 60 * 60 * 1000);
    return time >= cutoff;
};
