const listeners = new Set();
export function addNotificationResponseReceivedListener(callback) { listeners.add(callback); return { remove: () => listeners.delete(callback) }; }
export async function getLastNotificationResponseAsync() { return null; }
export async function clearLastNotificationResponseAsync() {}
export function dispatchNotification(data, identifier) { for (const callback of listeners) callback({ notification: { request: { identifier, content: { data } } } }); }
