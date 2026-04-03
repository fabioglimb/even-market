# Changelog

## 0.1.7

Released: 2026-04-03

No breaking changes.

### Changed

- the app now uses `even-toolkit` 1.6.3 for centered nav headers and shared bridge-only storage
- stock quote loading now uses Yahoo `v8/finance/chart` instead of the blocked quote endpoint
- navbar titles and drawer labels now update immediately when the market app language changes

### Notes

- this release is intended to verify the published toolkit package in the actual app

## 0.1.6

Released: 2026-04-02

No breaking changes.

### Added

- shared news filtering now stays in sync between webview and glasses
- alert notifications now support persistent web toasts and click-to-dismiss glasses interrupts

### Changed

- glasses alerts were redesigned into a cleaner multi-column layout with improved unread behavior
- browser/article synchronization is more reliable when opening news details from glasses
- this release now consumes `even-toolkit` 1.6.2

### Notes

- alert interrupts on glasses now stay visible until dismissed by click


## 0.1.5

Released: 2026-04-02

No breaking changes.

### Added

- synced news detail loading between webview and glasses, including fetched article body content and a browser action in the article navbar
- unread alert state, home badge counts, web toast notifications, and transient glasses alert interrupts

### Changed

- glasses home, watchlist, portfolio, overview, alerts, and news screens now use denser layouts without the old overflow bar behavior
- portfolio and overview on glasses now follow the multi-column watchlist-style layout instead of the old header-based text page
- alert handling now keeps newly triggered alerts visible even if they fire while the user is already on the alerts screen

### Notes

- the app remains on the current even-toolkit 1.6.1 line; no toolkit publish is required for this release
