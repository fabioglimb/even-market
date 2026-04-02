# Changelog

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
