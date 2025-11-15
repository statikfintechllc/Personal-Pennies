# Virtual Filesystem (VFS) Architecture

## Overview

The Personal-Pennies VFS is a **true client-side filesystem** that mirrors the entire repository structure in IndexedDB. It replaces the legacy bucket-based architecture (trades, charts, media, config, etc.) with a unified **Path → File** pattern that supports ALL file types.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│         (index.html, add-trade.html, etc.)              │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│              VFS Integration Layer                       │
│     (vfs-integration.js - patches fetch() calls)        │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│            Data Access Layer                             │
│  (data-access.js - high-level API for app data types)  │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│              VFS Adapter                                 │
│    (vfs-adapter.js - fetch()-like API with fallback)   │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│            Core VFS Layer                                │
│      (vfs.js - filesystem operations on IndexedDB)      │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│          IndexedDB Storage                               │
│   Database: PersonalPenniesVFS                          │
│   Store: filesystem (path-based keys)                   │
└──────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Core VFS Layer (`vfs.js`)

**Purpose:** Low-level filesystem operations on IndexedDB

**Key Features:**
- Path-based storage (no buckets)
- Support for ALL file types (text and binary)
- CRUD operations: read, write, update, delete
- Directory operations: list files, list directories
- File metadata: size, type, MIME type, last modified
- Export/import for backup

**Storage Format:**
```javascript
{
  path: "index.directory/SFTi.Tradez/week.2025.45/11:05:2025.1.md",
  content: "..." | ArrayBuffer | Blob,
  type: "text" | "binary",
  mimeType: "text/markdown",
  size: 1234,
  lastModified: "2025-11-14T18:15:33.806Z",
  metadata: { ... }
}
```

**API:**
```javascript
// Write operations
await VFS.writeFile(path, content, options);
await VFS.deleteFile(path);
await VFS.copyFile(sourcePath, destPath);
await VFS.moveFile(sourcePath, destPath);

// Read operations
const content = await VFS.readFile(path);
const fileData = await VFS.readFile(path, { metadata: true });
const exists = await VFS.fileExists(path);
const metadata = await VFS.stat(path);

// Directory operations
const files = await VFS.listFiles(dirPath);
const dirs = await VFS.listDirectories(dirPath);

// Utilities
const mimeType = VFS.getMimeType(path);
const isBinary = VFS.isBinaryFile(path);
const normalized = VFS.normalizePath(path);

// Bulk operations
const backup = await VFS.exportVFS();
await VFS.importVFS(backup);
await VFS.clearVFS();
const stats = await VFS.getVFSStats();
```

### 2. VFS Initialization (`vfs-init.js`)

**Purpose:** Populate VFS with repository content on first load

**Key Features:**
- Auto-detects if VFS is empty
- Fetches all files from repository
- Handles binary file encoding (base64)
- Migrates data from legacy bucket-based storage
- Progress reporting

**API:**
```javascript
// Auto-initialize (runs on startup)
await VFSInit.autoInitialize();

// Manual population
await VFSInit.populateVFS({
  force: false,  // Force repopulation
  onProgress: (progress) => console.log(progress),
  includeStatic: true,
  includeDynamic: true
});

// Migration from legacy storage
await VFSInit.migrateFromLegacyStorage();

// Check if initialization needed
const needs = await VFSInit.needsInitialization();
```

**Repository Structure:**
- Static files: Known list of critical files (HTML, JS, CSS, config)
- Dynamic directories: Scanned for content (trades, summaries, charts, media)

### 3. VFS Adapter (`vfs-adapter.js`)

**Purpose:** Fetch API wrapper with automatic VFS/network fallback

**Key Features:**
- Drop-in replacement for `fetch()`
- Returns Response-like objects
- Automatic fallback to network if file not in VFS
- Helper methods for common operations

**API:**
```javascript
// Fetch-like API
const response = await vfsFetch('/index.directory/trades-index.json');
const data = await response.json();

// Helper methods
const data = await readJSON('index.directory/analytics.json');
const text = await readText('index.directory/README.md');
await writeJSON('index.directory/config.json', { ... });
await writeText('index.directory/note.md', '# Note');

// Check existence
const exists = await exists('index.directory/somefile.json');

// Optional: Global fetch override
VFSAdapter.installGlobalVFSFetch();  // Replaces window.fetch
VFSAdapter.restoreOriginalFetch();   // Restores original
```

### 4. Data Access Layer (`data-access.js`)

**Purpose:** High-level API for application data types

**Key Features:**
- Typed methods for each data category
- Consistent error handling
- Logging and debugging
- VFS-first with fallback

**API:**
```javascript
const DataAccess = window.PersonalPenniesDataAccess;

// Trades
const tradesIndex = await DataAccess.loadTradesIndex();
const markdown = await DataAccess.loadTradeMarkdown(weekKey, tradeFile);
await DataAccess.saveTradeMarkdown(weekKey, tradeFile, content);
const html = await DataAccess.loadTradeHTML(tradeId);

// Analytics & Charts
const analytics = await DataAccess.loadAnalytics();
await DataAccess.saveAnalytics(data);
const chart = await DataAccess.loadChart(chartName);
await DataAccess.saveChart(chartName, data);

// Configuration
const config = await DataAccess.loadAccountConfig();
await DataAccess.saveAccountConfig(data);

// Notes
const notesIndex = await DataAccess.loadNotesIndex();
const note = await DataAccess.loadNote(notePath);
await DataAccess.saveNote(notePath, content);

// Summaries
const summary = await DataAccess.loadSummary(summaryKey);
await DataAccess.saveSummary(summaryKey, content);

// Media
const imageUrl = await DataAccess.loadImage(imagePath);
await DataAccess.saveImage(imagePath, arrayBuffer, mimeType);

// Utilities
const exists = await DataAccess.fileExists(path);
const files = await DataAccess.listFiles(dirPath);
const stats = await DataAccess.getVFSStats();
```

### 5. VFS Integration (`vfs-integration.js`)

**Purpose:** Patches existing code to use VFS transparently

**Key Features:**
- Monkey-patches TradingJournal methods
- Intercepts global `fetch()` calls for JSON files
- Non-invasive integration
- Maintains backwards compatibility

**What it patches:**
- `TradingJournal.prototype.loadRecentTrades()` - Uses DataAccess instead of fetch
- `window.fetch()` - Intercepts JSON file requests, redirects through VFS

### 6. Service Worker (`service-worker-filesystem.js`)

**Purpose:** Intercepts HTTP requests and serves files from VFS

**Key Features:**
- Handles ALL file types (md, html, json, js, css, images, pdfs)
- Automatic content-type detection
- Falls back to network for missing files
- Cache headers for performance
- Offline support

**How it works:**
1. Browser requests `/index.directory/trades-index.json`
2. Service worker intercepts request
3. Normalizes path: `index.directory/trades-index.json`
4. Reads from VFS IndexedDB
5. Returns Response with content and headers
6. If not in VFS, falls back to network

## Data Flow

### Read Operation
```
UI Component
    ↓ fetch('/index.directory/trades-index.json')
VFS Integration (intercepts fetch)
    ↓ vfsFetch()
VFS Adapter (tries VFS first)
    ↓ VFS.readFile()
Core VFS (reads from IndexedDB)
    ↓ Returns file content
VFS Adapter (wraps in Response)
    ↓ Returns Response
UI Component (receives data)
```

### Write Operation
```
UI Component
    ↓ DataAccess.saveAccountConfig(config)
Data Access Layer
    ↓ writeJSON(path, data)
VFS Adapter
    ↓ VFS.writeFile(path, json)
Core VFS
    ↓ Stores in IndexedDB
    ↓ Updates metadata
Service Worker (serves from VFS on next read)
```

## Migration Strategy

The VFS implementation supports **dual-storage** during migration:

1. **Legacy Storage (Bucket-based):**
   - Database: `PersonalPennies`
   - Stores: `trades`, `charts`, `media`, `summaries`, `config`, etc.
   - Still supported for backwards compatibility

2. **New Storage (VFS):**
   - Database: `PersonalPenniesVFS`
   - Store: `filesystem` (single store, path-based)
   - Primary storage going forward

**Migration Process:**
1. On first load, VFS checks if empty
2. If empty, migrates data from legacy storage
3. Fetches missing files from repository
4. Both systems write to both storages temporarily
5. Eventually, legacy storage can be deprecated

## File Organization

VFS mirrors the exact repository structure:

```
index.directory/
├── account-config.json
├── trades-index.json
├── analytics.json
├── notes-index.json
├── add-trade.html
├── add-note.html
├── all-trades.html
├── analytics.html
├── books.html
├── import.html
├── notes.html
├── review.html
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── glass-effects.css
│   │   └── ...
│   ├── js/
│   │   ├── app.js
│   │   ├── accountManager.js
│   │   └── ...
│   ├── charts/
│   │   ├── equity-curve-data.json
│   │   ├── portfolio-value-week.json
│   │   └── ...
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── ...
│   └── system/
│       ├── storage/
│       │   ├── vfs.js
│       │   ├── vfs-init.js
│       │   ├── vfs-adapter.js
│       │   └── data-access.js
│       └── scripts/
│           └── ...
├── media/
│   ├── trade-001-entry.png
│   ├── trade-001-exit.png
│   └── ...
├── SFTi.Tradez/
│   ├── week.2025.45/
│   │   ├── 11:04:2025.1.md
│   │   ├── 11:05:2025.1.md
│   │   └── ...
│   └── ...
├── SFTi.Notez/
│   ├── 7.Step.Frame.md
│   ├── GSTRWT.md
│   └── ...
├── trades/
│   ├── trade-001-SCNX.html
│   ├── trade-002-PHIO.html
│   └── ...
└── summaries/
    ├── weekly-2025-W45.md
    ├── monthly-2025-11.md
    └── ...
```

## Benefits

### 1. **Unified Storage**
- Single storage mechanism for all file types
- No need to think about buckets or stores
- Path-based access is intuitive

### 2. **Offline-First**
- Complete repository mirror in browser
- Works fully offline after first load
- Service worker serves everything from VFS

### 3. **Performance**
- IndexedDB is fast for local access
- No network requests after initial load
- Service worker caching

### 4. **Flexibility**
- Easy to add new file types
- No schema changes needed
- Supports binary files natively

### 5. **Simplicity**
- Clean, intuitive API
- Fetch-like interface
- Transparent integration

### 6. **Scalability**
- Can handle thousands of files
- Efficient storage (only changed files updated)
- Export/import for backup

### 7. **Mobile-Friendly**
- LocalForage handles browser differences
- Service workers widely supported
- PWA-ready

## Limitations & Considerations

### 1. **Initial Load**
- First load fetches all repository files
- Can take 10-30 seconds depending on repo size
- Progress feedback important

### 2. **Storage Quota**
- Browser storage limits (usually 50-100 MB for free)
- Can request persistent storage
- User can clear storage

### 3. **Binary Files**
- Large images/PDFs increase storage usage
- Consider compression or external hosting
- Can skip very large files

### 4. **Service Worker**
- Requires HTTPS (except localhost)
- Must register before first use
- Update/activation lifecycle

### 5. **Synchronization**
- VFS is local only
- Changes don't auto-sync to repository
- Need export/import for backup

## Future Enhancements

1. **Background Sync**
   - Sync VFS changes back to repository
   - Use Background Sync API

2. **Selective Sync**
   - Only sync certain directories
   - On-demand file loading

3. **Compression**
   - Compress text files in storage
   - Decompress on read

4. **Versioning**
   - Track file versions
   - Rollback support

5. **Conflict Resolution**
   - Handle concurrent edits
   - Merge strategies

6. **Cloud Backup**
   - Automatic backup to cloud storage
   - Restore from backup

## Usage Examples

### Example 1: Load and Display Trades
```javascript
// Old way (direct fetch)
const response = await fetch('/index.directory/trades-index.json');
const data = await response.json();

// New way (automatic VFS)
const response = await fetch('/index.directory/trades-index.json');
const data = await response.json();
// ^ Same code, but served from VFS!

// Or explicit DataAccess
const data = await DataAccess.loadTradesIndex();
```

### Example 2: Save Configuration
```javascript
const config = {
  starting_balance: 10000,
  deposits: [],
  withdrawals: []
};

// Save to VFS
await DataAccess.saveAccountConfig(config);

// Verify it was saved
const loaded = await DataAccess.loadAccountConfig();
console.log(loaded.starting_balance); // 10000
```

### Example 3: List Trade Files
```javascript
// List all trades for a week
const files = await VFS.listFiles('index.directory/SFTi.Tradez/week.2025.45');
console.log(files);
// ['index.directory/SFTi.Tradez/week.2025.45/11:04:2025.1.md', ...]

// List all weeks
const weeks = await VFS.listDirectories('index.directory/SFTi.Tradez');
console.log(weeks);
// ['week.2025.45', 'week.2025.46', ...]
```

### Example 4: Export Backup
```javascript
// Export entire VFS
const backup = await VFS.exportVFS();

// Download as JSON
const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `vfs-backup-${Date.now()}.json`;
a.click();
```

### Example 5: Import Backup
```javascript
// User selects a backup file
const file = document.getElementById('backup-file').files[0];
const text = await file.text();
const backup = JSON.parse(text);

// Import into VFS
await VFS.importVFS(backup);

// Reload page to see restored data
location.reload();
```

## Debugging

### Check VFS Status
```javascript
// Get VFS statistics
const stats = await VFS.getVFSStats();
console.log(stats);
// {
//   totalFiles: 150,
//   textFiles: 120,
//   binaryFiles: 30,
//   totalSize: 5242880,
//   totalSizeMB: "5.00"
// }
```

### View VFS Contents
```javascript
// List all files
const allFiles = await VFS.listFiles('', { recursive: true });
console.log(allFiles);
```

### Check Service Worker
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) {
    console.log('Service Worker registered:', reg);
  } else {
    console.log('No Service Worker registered');
  }
});
```

### Monitor VFS Operations
```javascript
// VFS logs all operations to console with [VFS] prefix
// Enable verbose logging:
// Open DevTools → Console → Filter by "VFS"
```

## Performance Metrics

Typical performance on modern browsers:

- **First load (empty VFS):** 10-30 seconds
- **Subsequent loads:** < 1 second
- **Read operation:** < 10ms
- **Write operation:** < 50ms
- **List directory:** < 20ms
- **Export VFS:** 1-5 seconds (depends on size)

## Conclusion

The VFS architecture provides a robust, scalable, and user-friendly way to store and access repository data entirely client-side. It eliminates the complexity of bucket-based storage, supports all file types natively, and enables true offline-first functionality.

**Key Takeaway:** Think of VFS as a complete filesystem in the browser. Any file in the repository can be accessed via its path, just like on disk.
