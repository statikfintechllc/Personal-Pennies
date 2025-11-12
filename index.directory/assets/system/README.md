# Personal-Pennies Client-Side System

This directory contains the client-side JavaScript implementation of the Personal-Pennies trading journal system. It replaces the Python scripts and GitHub Actions workflow with browser-based processing using IndexedDB for offline-first functionality.

## 📁 Directory Structure

```
assets/system/
├── storage/
│   └── db.js                    # IndexedDB storage layer (LocalForage)
├── scripts/
│   ├── utils.js                 # Utility functions (from utils.py)
│   ├── parseTrades.js           # Trade parser (from parse_trades.py)
│   ├── generateAnalytics.js     # Analytics generator (from generate_analytics.py)
│   └── importExport.js          # Backup/restore utilities
├── workflows/
│   └── tradePipeline.js         # Event-driven pipeline orchestrator
├── templates/                   # Template generators (to be implemented)
└── loader.js                    # System initialization loader
```

## 🚀 Features

### ✅ Implemented
- **IndexedDB Storage**: All data stored locally using LocalForage
- **Trade Parser**: Converts markdown trades to JSON index
- **Analytics Generator**: All 21 analytics calculations ported from Python
  - Expectancy, Profit Factor, Win/Loss Streaks
  - Drawdown Series, Kelly Criterion, Sharpe Ratio
  - R-Multiple Distribution, Returns Metrics
  - Tag Aggregation (by strategy, setup, session)
- **Event-Driven Pipeline**: Automatically processes trades on add/update/delete
- **Import/Export**: JSON backup and CSV export functionality
- **Form Integration**: add-trade.html saves directly to IndexedDB

### 🔄 In Progress
- Charts Generator (from generate_charts.py)
- Summaries Generator (from generate_summaries.py)
- Trade Pages Generator (from generate_trade_pages.py)
- Index Generators (books, notes, master index)

## 📊 IndexedDB Schema

**Database:** `PersonalPennies` (v1)

**Stores:**
- `trades` - Trade markdown files and data
- `notes` - Trading notes
- `books` - Book reviews and summaries
- `media` - Media file references
- `analytics` - Computed analytics data
- `charts` - Chart data
- `summaries` - Period summaries (week, month, year)
- `indexes` - Generated indexes (trades-index, books-index, etc.)
- `config` - Configuration (account-config, etc.)

**Key Pattern:** Mirrors file structure
```
trades:      "week.2025.45/11:05:2025.1.md"
notes:       "2025-11-05-market-analysis.md"
books:       "trading-in-the-zone.md"
summaries:   "week-2025-45-summary"
```

## 🔧 Usage

### Loading the System

Add to any HTML page that needs the system:

```html
<!-- Load the system (ES modules) -->
<script type="module" src="assets/system/loader.js"></script>

<!-- System will be available at window.PersonalPenniesSystem -->
```

### Adding a Trade

```javascript
// Trade data
const trade = {
  trade_number: 1,
  ticker: 'AAPL',
  entry_date: '2025-11-05',
  entry_time: '09:30',
  exit_date: '2025-11-05',
  exit_time: '15:00',
  entry_price: 150.00,
  exit_price: 152.50,
  position_size: 100,
  direction: 'LONG',
  strategy: 'Breakout',
  stop_loss: 148.00,
  target_price: 155.00,
  broker: 'IBKR',
  pnl_usd: 250.00,
  pnl_percent: 1.67,
  notes: 'Clean breakout above resistance'
};

// Calculate week key
const weekKey = window.PersonalPenniesUtils.getYearWeekNumber(new Date(trade.entry_date));

// Save to IndexedDB
await window.PersonalPenniesDB.saveTrade(weekKey, trade);

// Emit event to trigger pipeline
window.SFTiEventBus.emit('trade:added', { key: tradeKey, data: trade });
```

### Running the Pipeline Manually

```javascript
// Run the complete pipeline
const result = await window.PersonalPenniesPipeline.runTradePipeline();

// Check status
const status = window.PersonalPenniesPipeline.getPipelineStatus();
```

### Exporting/Importing Data

```javascript
// Export all data to JSON file
await window.PersonalPenniesImportExport.exportToFile();

// Export trades to CSV
await window.PersonalPenniesImportExport.exportTradesToCSV();

// Import from JSON file (in UI)
// Use the file input in the import/export UI
```

## 🎯 Analytics Calculations

All 21 analytics calculations from the Python version are preserved exactly:

### Core Metrics
1. **Expectancy** - Average P&L per trade
2. **Profit Factor** - Gross profit / gross loss
3. **Max Win Streak** - Longest consecutive winning trades
4. **Max Loss Streak** - Longest consecutive losing trades
5. **Max Drawdown** - Largest peak-to-trough decline (USD)
6. **Max Drawdown %** - Largest decline as % of capital

### Risk Metrics
7. **Kelly Criterion** - Optimal position size
8. **Sharpe Ratio** - Risk-adjusted returns
9. **Avg Risk %** - Average risk per trade as % of account
10. **Avg Position Size %** - Average position size as % of account

### Return Metrics
11. **Total Return %** - Total P&L as % of initial capital
12. **Avg Return %** - Average return per trade as %
13. **R-Multiple Distribution** - Returns in risk units

### Advanced Analysis
14. **Drawdown Series** - Time series of drawdowns
15. **MAE/MFE Analysis** - Mean adverse/favorable excursion (placeholder)

### Tag Aggregation (×6 = 6 metrics)
For each tag type (strategy, setup, session):
16-21. Total trades, Win rate, Total P&L, Avg P&L, Expectancy

## 🔄 Pipeline Flow

```
Trade Added
    ↓
IndexedDB.saveTrade()
    ↓
EventBus.emit('trade:added')
    ↓
Pipeline.runTradePipeline()
    ├─> parseTrades()           → trades-index.json
    ├─> generateAnalytics()     → analytics-data.json
    ├─> generateCharts()        → chart data (TBD)
    ├─> generateSummaries()     → summary data (TBD)
    └─> generateTradePages()    → trade HTML pages (TBD)
    ↓
EventBus.emit('pipeline:completed')
```

## 📱 Mobile Support

The system uses LocalForage which provides excellent mobile browser support:
- **IndexedDB** (primary) - Modern browsers
- **WebSQL** (fallback) - Older mobile browsers
- **localStorage** (fallback) - Basic support

No File System Access API dependency = better iOS/Android compatibility.

## 🔒 Data Persistence

All data is stored locally in the browser's IndexedDB:
- **Offline-first**: Works without internet
- **Persistent**: Data survives page reloads
- **Private**: Data never leaves the device
- **Exportable**: Full backup/restore capability

## 🐛 Debugging

Enable verbose logging in console:

```javascript
// Check system status
console.log(window.PersonalPenniesSystem);

// Check if stores are initialized
console.log(window.PersonalPenniesDB);

// Get pipeline status
console.log(window.PersonalPenniesPipeline.getPipelineStatus());

// List all trades
const trades = await window.PersonalPenniesDB.getAllTrades();
console.log(trades);

// Get analytics
const analytics = await window.PersonalPenniesDB.getAnalytics();
console.log(analytics);
```

## 🔄 Migration from Python System

The JavaScript system preserves exact compatibility with the Python system:

### Data Structure
- Trade markdown frontmatter format unchanged
- Directory naming convention preserved (`week.YYYY.WW/`)
- File naming pattern maintained (`MM:DD:YYYY.N.md`)
- JSON output formats identical

### Analytics
- All 21 calculations produce identical results
- Same rounding and precision rules
- Same edge case handling

### Events
- Event names match existing EventBus events
- Event data structures unchanged
- Event flow preserved

## 📝 Original Python Scripts

The original Python scripts are preserved in `.github/scripts/` with detailed comments explaining the conversion process. These serve as reference documentation.

## 🚧 Future Enhancements

- [ ] Chart generation (PNG/SVG)
- [ ] Summary generation (weekly, monthly, yearly)
- [ ] Trade page generation (HTML)
- [ ] Book/Note index generation
- [ ] Screenshot storage and optimization
- [ ] Broker CSV import (Webull, IBKR, Schwab, Robinhood)
- [ ] Real-time sync across devices
- [ ] PWA offline support
- [ ] Performance optimization for large datasets

## 📄 License

Same as Personal-Pennies repository.
