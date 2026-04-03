function getBridge(): any {
  const bridge = (window as any).__evenBridge;
  if (bridge?.setLocalStorage) return bridge;
  if (bridge?.rawBridge?.setLocalStorage) return bridge.rawBridge;
  return null;
}

async function getRawBridge(): Promise<any> {
  const existing = getBridge();
  if (existing) return existing;
  try {
    const { EvenBetterSdk } = await import('@jappyjan/even-better-sdk');
    const raw = await Promise.race([
      EvenBetterSdk.getRawBridge(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    return raw;
  } catch {
    return null;
  }
}

async function getStorageBridge(): Promise<any> {
  return getBridge() ?? await getRawBridge();
}

export async function storageGet<T>(key: string, fallback: T): Promise<T> {
  const bridge = await getStorageBridge();
  if (!bridge?.getLocalStorage) return fallback;
  try {
    const raw = await bridge.getLocalStorage(key);
    if (raw && raw !== '') return JSON.parse(raw) as T;
  } catch {
    // Ignore bridge storage failures and fall back to the provided default.
  }
  return fallback;
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  const bridge = await getStorageBridge();
  if (!bridge?.setLocalStorage) return;
  try {
    await bridge.setLocalStorage(key, JSON.stringify(value));
  } catch {
    // Ignore bridge storage failures; callers already handle empty fallbacks.
  }
}
