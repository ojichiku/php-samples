// Keep the URL alive briefly so browsers can start the download before releasing it.
const pending = new Map();

export function downloadText(text, filename = 'text-result.txt') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const release = () => { URL.revokeObjectURL(url); clearTimeout(pending.get(url)); pending.delete(url); };
    try {
        link.href = url;
        link.download = filename;
        link.hidden = true;
        document.body.append(link);
        link.click();
        pending.set(url, setTimeout(release, 60_000));
    } catch (error) {
        release();
        throw error;
    } finally {
        link.remove();
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
        for (const [url, timer] of pending) { clearTimeout(timer); URL.revokeObjectURL(url); }
        pending.clear();
    });
}
