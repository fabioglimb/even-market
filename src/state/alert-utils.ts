import type { PriceAlert } from './types';

export function isUnreadTriggeredAlert(alert: PriceAlert): boolean {
  return alert.triggered && !alert.seenAt;
}

export function getUnreadTriggeredAlertCount(alerts: PriceAlert[]): number {
  return alerts.filter(isUnreadTriggeredAlert).length;
}

export function markTriggeredAlertsSeen(alerts: PriceAlert[], seenAt = Date.now()): PriceAlert[] {
  let changed = false;
  const next = alerts.map((alert) => {
    if (!isUnreadTriggeredAlert(alert)) return alert;
    changed = true;
    return { ...alert, seenAt };
  });
  return changed ? next : alerts;
}

export function getLatestTriggeredAlert(alerts: PriceAlert[]): PriceAlert | null {
  let latest: PriceAlert | null = null;
  for (const alert of alerts) {
    if (!alert.triggeredAt) continue;
    if (!latest || (latest.triggeredAt ?? 0) < alert.triggeredAt) {
      latest = alert;
    }
  }
  return latest;
}

export function sortAlertsForDisplay(alerts: PriceAlert[]): PriceAlert[] {
  return [...alerts].sort((a, b) => {
    const aUnread = isUnreadTriggeredAlert(a);
    const bUnread = isUnreadTriggeredAlert(b);
    if (aUnread !== bUnread) return aUnread ? -1 : 1;
    if (a.triggered !== b.triggered) return a.triggered ? -1 : 1;

    const aTime = a.triggered ? (a.triggeredAt ?? a.createdAt) : a.createdAt;
    const bTime = b.triggered ? (b.triggeredAt ?? b.createdAt) : b.createdAt;
    return bTime - aTime;
  });
}
