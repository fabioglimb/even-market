import type {
  EvenHubEvent,
  List_ItemEvent,
  Text_ItemEvent,
  Sys_ItemEvent,
} from '@evenrealities/even_hub_sdk';
import { OsEventTypeList } from '@evenrealities/even_hub_sdk';
import type { AppState } from '../state/types';
import type { Action } from '../state/actions';
import { tryConsumeTap, isScrollSuppressed, isScrollDebounced } from 'even-toolkit/gestures';

export function mapEvenHubEvent(event: EvenHubEvent, state: AppState): Action | null {
  if (!event) return null;
  try {
    if (event.listEvent) return mapListEvent(event.listEvent, state);
    if (event.textEvent) return mapTextEvent(event.textEvent, state);
    if (event.sysEvent) return mapSysEvent(event.sysEvent, state);
    return null;
  } catch {
    return null;
  }
}

function mapListEvent(event: List_ItemEvent, _state: AppState): Action | null {
  const et = event.eventType;
  switch (et) {
    case OsEventTypeList.CLICK_EVENT:
      if (!tryConsumeTap('tap')) return null;
      return { type: 'SELECT_HIGHLIGHTED' };
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      if (!tryConsumeTap('double')) return null;
      return { type: 'GO_BACK' };
    case OsEventTypeList.SCROLL_TOP_EVENT:
      if (isScrollDebounced('prev') || isScrollSuppressed()) return null;
      return { type: 'HIGHLIGHT_MOVE', direction: 'up' };
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      if (isScrollDebounced('next') || isScrollSuppressed()) return null;
      return { type: 'HIGHLIGHT_MOVE', direction: 'down' };
    default:
      if (event.currentSelectItemIndex != null && (et === undefined || (et as number) === 0)) {
        if (!tryConsumeTap('tap')) return null;
        return { type: 'SELECT_HIGHLIGHTED' };
      }
      return null;
  }
}

function mapTextEvent(event: Text_ItemEvent, _state: AppState): Action | null {
  const et = event.eventType;
  switch (et) {
    case OsEventTypeList.CLICK_EVENT:
      if (!tryConsumeTap('tap')) return null;
      return { type: 'SELECT_HIGHLIGHTED' };
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      if (!tryConsumeTap('double')) return null;
      return { type: 'GO_BACK' };
    case OsEventTypeList.SCROLL_TOP_EVENT:
      if (isScrollDebounced('prev') || isScrollSuppressed()) return null;
      return { type: 'HIGHLIGHT_MOVE', direction: 'up' };
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      if (isScrollDebounced('next') || isScrollSuppressed()) return null;
      return { type: 'HIGHLIGHT_MOVE', direction: 'down' };
    default:
      if (et == null) {
        if (!tryConsumeTap('tap')) return null;
        return { type: 'SELECT_HIGHLIGHTED' };
      }
      return null;
  }
}

function mapSysEvent(event: Sys_ItemEvent, _state: AppState): Action | null {
  const et = event.eventType;
  switch (et) {
    case OsEventTypeList.CLICK_EVENT:
      if (!tryConsumeTap('tap')) return null;
      return { type: 'SELECT_HIGHLIGHTED' };
    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      if (!tryConsumeTap('double')) return null;
      return { type: 'GO_BACK' };
    case OsEventTypeList.SCROLL_TOP_EVENT:
      if (isScrollDebounced('prev') || isScrollSuppressed()) return null;
      return { type: 'HIGHLIGHT_MOVE', direction: 'up' };
    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      if (isScrollDebounced('next') || isScrollSuppressed()) return null;
      return { type: 'HIGHLIGHT_MOVE', direction: 'down' };
    default:
      if (et == null) {
        if (!tryConsumeTap('tap')) return null;
        return { type: 'SELECT_HIGHLIGHTED' };
      }
      return null;
  }
}
