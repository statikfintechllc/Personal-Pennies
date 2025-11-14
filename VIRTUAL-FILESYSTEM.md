# Virtual Filesystem Implementation

## Version 2.0 - Complete Repository Mirror

**Status:** ✅ **IMPLEMENTED**

The VFS has been completely redesigned to mirror the entire repository structure, not just generated files.

### What Changed

**Version 1.0 (Old):**
- Bucket-based storage (trades, summaries, charts)
- Selective file interception
- Manual path mapping
- Limited file type support

**Version 2.0 (New):**
- **Complete repository mirror** in IndexedDB
- **Path-based storage** (no buckets)
- **All file types** supported (md, js, json, html, css, images, pdfs, etc.)
- **Unified API** across all components
- **Automatic initialization** from repository
- **Transparent integration** via fetch() patching

## Architecture Overview

See [VFS-ARCHITECTURE.md](./VFS-ARCHITECTURE.md) for detailed architecture documentation.

```
User Interface → VFS Integration → Data Access → VFS Adapter → Core VFS → IndexedDB
                                                                              ↓
                                                              Service Worker serves from VFS
```

## Key Components

1. **Core VFS** (`vfs.js`) - Low-level filesystem operations
2. **VFS Init** (`vfs-init.js`) - Auto-populate from repository
3. **VFS Adapter** (`vfs-adapter.js`) - Fetch API wrapper
4. **Data Access** (`data-access.js`) - High-level typed API
5. **VFS Integration** (`vfs-integration.js`) - Transparent patching
6. **Service Worker** (`service-worker-filesystem.js`) - HTTP request interception

## Quick Start

## Problem

The original Python scripts write files to the actual filesystem:
- Trade pages: `index.directory/trades/trade-XXX-TICKER.html`
- Summaries: `index.directory/summaries/weekly-YYYY-WW.md`
- Charts: `index.directory/assets/charts/*.json`

Existing HTML pages (`review.html`, `all-weeks.html`) fetch these files directly:
```javascript
const response = await fetch('./summaries/weekly-2025-W45.md');
```

**Challenge**: Browser JavaScript cannot write files to the filesystem (File System Access API has poor mobile support).

## Solution: Service Worker Virtual Filesystem

### Architecture

1. **JavaScript generators save data to IndexedDB** (browser-compatible)
   - `generateSummaries.js` → saves to `summaries` store with `markdown` field
   - `generateTradePages.js` → saves to `trades` store with `html` field
   - `generateCharts.js` → saves to `charts` store with chart data

2. **Service Worker intercepts file requests** and serves from IndexedDB
   - `fetch('./summaries/weekly-2025-W45.md')` → Service Worker reads from IndexedDB
   - `fetch('./trades/trade-001-AAPL.html')` → Service Worker reads from IndexedDB
   - `fetch('./assets/charts/equity-curve-data.json')` → Service Worker reads from IndexedDB

3. **Existing HTML pages work unchanged**
   - No code changes needed in `review.html` or `all-weeks.html`
   - Transparent to the application layer

### Implementation

**Service Worker** (`service-worker-filesystem.js`):
- Intercepts requests for `/summaries/*.md`, `/trades/*.html`, `/assets/charts/*.json`
- Reads data from IndexedDB using LocalForage
- Returns Response objects with correct Content-Type headers
- Falls through to network for other requests

**Registration** (`assets/js/registerServiceWorker.js`):
- Registers Service Worker on page load
- Handles updates and version management
- Falls back gracefully if Service Workers not supported

**Updated Generators**:
- `generateSummaries.js` - Saves markdown to IndexedDB with correct key format
- `generateTradePages.js` - Saves HTML to IndexedDB with `page-` prefix for lookup
- `generateCharts.js` - Already saves to IndexedDB correctly

### How It Works

```
User visits review.html
  ↓
Page loads and makes fetch('./summaries/weekly-2025-W45.md')
  ↓
Service Worker intercepts the request
  ↓
Service Worker extracts filename: 'weekly-2025-W45'
  ↓
Service Worker queries IndexedDB summaries store
  ↓
Service Worker finds data.markdown content
  ↓
Service Worker returns Response with markdown text
  ↓
review.html receives markdown as if it came from disk
```

### Benefits

1. ✅ **Browser-only operation** - No server needed, works offline
2. ✅ **Mobile compatible** - Service Workers widely supported, File System Access API is not
3. ✅ **Backward compatible** - Existing pages work without modification
4. ✅ **Progressive enhancement** - Falls back to real files if Service Worker unavailable
5. ✅ **PWA ready** - Service Worker enables full offline PWA functionality

### Data Storage Format

**Summaries** (`summaries` store):
```javascript
{
  key: 'weekly-2025-W45',
  value: {
    period: 'weekly',
    stats: { /* ... */ },
    markdown: '# Week 2025-W45\n\n## Performance...',
    review: { /* ... */ }
  }
}
```

**Trade Pages** (`trades` store):
```javascript
{
  key: 'page-trade-001-AAPL',
  value: {
    trade_number: 1,
    ticker: 'AAPL',
    filename: 'trade-001-AAPL.html',
    html: '<!DOCTYPE html><html>...',
    generated_at: '2025-11-13T02:00:00.000Z'
  }
}
```

**Charts** (`charts` store):
```javascript
{
  key: 'all-charts',
  value: {
    equity_curve: { labels: [], datasets: [] },
    win_loss_by_strategy: { /* ... */ },
    portfolio_value_charts: {
      '7d': { labels: [], datasets: [] },
      '1m': { labels: [], datasets: [] }
      // ... more timeframes
    }
  }
}
```

### Path Mapping

| File Request | IndexedDB Key | Store |
|--------------|---------------|-------|
| `/summaries/weekly-2025-W45.md` | `weekly-2025-W45` | `summaries` |
| `/summaries/monthly-2025-11.md` | `monthly-2025-11` | `summaries` |
| `/trades/trade-001-AAPL.html` | `page-trade-001-AAPL` | `trades` |
| `/assets/charts/equity-curve-data.json` | `all-charts.equity_curve` | `charts` |
| `/assets/charts/portfolio-value-7d.json` | `all-charts.portfolio_value_charts.7d` | `charts` |

### Setup Instructions

1. **Include Service Worker registration in HTML pages**:
```html
<script src="assets/js/registerServiceWorker.js"></script>
```

2. **Service Worker must be at root level** for proper scope:
- File location: `/index.directory/service-worker-filesystem.js`
- Served from: `/service-worker-filesystem.js`

3. **HTTPS required in production** (localhost works for development)

### Testing

1. Open browser DevTools → Application → Service Workers
2. Verify "service-worker-filesystem" is active
3. Open Network tab, check "Offline" mode
4. Navigate to `review.html` or `all-weeks.html`
5. Verify files load from IndexedDB (X-Source: IndexedDB header)

### Fallback Behavior

If Service Workers are not available:
- Modern browsers: All supported (98%+ compatibility)
- Without Service Worker: Pages will try to fetch files from disk (requires Python scripts to run)
- Graceful degradation: System shows error message if files missing

### Migration Path

**Phase 1** (Current): Hybrid approach
- Python scripts write files to disk (backward compatible)
- JavaScript generators save to IndexedDB (new system)
- Service Worker serves from IndexedDB when available
- Falls back to disk files if Service Worker fails

**Phase 2** (Future): Full browser-only
- Remove Python script file writes
- Service Worker is required (show setup instructions if missing)
- All data in IndexedDB
- Export feature creates downloadable backup

### Maintenance

**Updating Service Worker**:
1. Modify `service-worker-filesystem.js`
2. Change `CACHE_NAME` version number
3. Old cache automatically cleaned on activation

**Debugging**:
- Check Service Worker console in DevTools
- Look for `[ServiceWorker]` prefixed logs
- Verify IndexedDB data in Application tab
- Check Response headers for `X-Source: IndexedDB`

### Limitations

1. **Browser must support Service Workers** (98%+ do, except very old browsers)
2. **Files not visible in filesystem** (pure virtual files)
3. **Requires HTTPS in production** (localhost exception for development)
4. **Initial page load must be online** to register Service Worker

### Future Enhancements

1. **Cache static assets** for full offline capability
2. **Background sync** to sync data when online
3. **Push notifications** for trade reminders
4. **Periodic background sync** for data backups
