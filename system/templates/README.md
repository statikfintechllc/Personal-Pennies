# System Templates

This directory contains markdown templates for generating trade and summary files in the Personal-Pennies trading journal system.

## Available Templates

### 1. `trade.md.template`
**Purpose**: Template for individual trade markdown files

**Location**: Generated files placed in `index.directory/SFTi.Tradez/week.YYYY.WW/MM:DD:YYYY.N.md`

**Template Variables**:
- `{trade_number}` - Unique trade identifier
- `{ticker}` - Stock/asset symbol
- `{entry_date}` - Entry date (YYYY-MM-DD)
- `{entry_time}` - Entry time (HH:MM:SS)
- `{exit_date}` - Exit date (YYYY-MM-DD)
- `{exit_time}` - Exit time (HH:MM:SS)
- `{entry_price}` - Entry price (USD)
- `{exit_price}` - Exit price (USD)
- `{position_size}` - Number of shares/contracts
- `{direction}` - LONG or SHORT
- `{strategy}` - Trading strategy name
- `{stop_loss}` - Stop loss price
- `{target_price}` - Target/take-profit price
- `{risk_reward_ratio}` - R:R ratio (e.g., 2.5 for 1:2.5)
- `{broker}` - Broker name (ibkr, schwab, robinhood, webull)
- `{pnl_usd}` - Profit/loss in USD
- `{pnl_percent}` - Profit/loss percentage
- `{screenshots}` - Array of screenshot paths
- `{notes}` - Trade notes/journal content

**YAML Frontmatter**: All variables are included in frontmatter for programmatic access

**Usage**:
```javascript
// In JavaScript
const fs = require('fs');
const template = fs.readFileSync('system/templates/trade.md.template', 'utf8');
const tradeFile = template
  .replace(/{ticker}/g, trade.ticker)
  .replace(/{entry_date}/g, trade.entry_date)
  // ... replace all variables
```

### 2. `weekly-summary.md.template`
**Purpose**: Template for weekly trading summaries

**Location**: Generated files placed in `index.directory/SFTi.Tradez/week.YYYY.WW/master.trade.md`

**Template Variables**:
- `{week_number}` - ISO week number (1-53)
- `{start_date}` - Week start date (Monday)
- `{end_date}` - Week end date (Sunday)
- `{total_trades}` - Total trades executed
- `{winning_trades}` - Number of profitable trades
- `{losing_trades}` - Number of losing trades
- `{win_rate}` - Win rate percentage
- `{total_pnl}` - Total P&L (USD)
- `{avg_pnl}` - Average P&L per trade
- `{best_trade_ticker}` - Ticker of best trade
- `{best_trade_pnl}` - P&L of best trade
- `{worst_trade_ticker}` - Ticker of worst trade
- `{worst_trade_pnl}` - P&L of worst trade
- `{total_volume}` - Total shares/contracts traded
- `{what_went_well}` - Reflection section (user-edited)
- `{what_needs_improvement}` - Reflection section (user-edited)
- `{key_lessons}` - Reflection section (user-edited)
- `{strategy_breakdown}` - Performance by strategy
- `{goal_1}`, `{goal_2}`, `{goal_3}` - Next week goals
- `{generated_date}` - Generation timestamp

**Reflection Sections**: User-edited sections preserved across regenerations by `generate_week_summaries.js`

**Usage**:
```javascript
// In JavaScript
const fs = require('fs');
const template = fs.readFileSync('system/templates/weekly-summary.md.template', 'utf8');
const summaryFile = template
  .replace(/{week_number}/g, weekNumber)
  .replace(/{total_trades}/g, stats.totalTrades)
  // ... replace all variables
```

## Template Usage

### 1. CSV Import Workflow
**Script**: `system/scripts/import_csv.js`

Process:
1. Parse CSV file with broker-specific parser
2. Load `trade.md.template`
3. Replace variables with parsed trade data
4. Write to week folder: `week.YYYY.WW/MM:DD:YYYY.N.md`

### 2. Week Summary Generation
**Script**: `system/scripts/generate_week_summaries.js`

Process:
1. Scan week folder for trade files
2. Calculate statistics
3. Load `weekly-summary.md.template`
4. Replace variables with calculated stats
5. Preserve user reflection sections
6. Write to `week.YYYY.WW/master.trade.md`

### 3. Manual Trade Entry
Users can manually copy templates and fill in values:
```bash
cp system/templates/trade.md.template index.directory/SFTi.Tradez/week.2024.45/11:15:2024.1.md
# Edit file with trade data
```

## Template Customization

### Adding New Variables

1. Add variable to template: `{new_variable}`
2. Update corresponding script to replace variable
3. Update documentation (this README)

### Modifying Structure

Templates use standard markdown with:
- YAML frontmatter (delimited by `---`)
- Markdown body content
- Variable placeholders in `{curly_braces}`

### Best Practices

1. **Keep frontmatter complete**: All variables should appear in frontmatter for programmatic access
2. **Use descriptive variable names**: Clear naming helps with maintainability
3. **Preserve user content**: Scripts should preserve user-edited sections (like reflections)
4. **Document all variables**: Update this README when adding variables

## Variable Replacement Patterns

### Simple Replacement
```javascript
content = content.replace(/{variable}/g, value);
```

### Conditional Replacement
```javascript
if (trade.screenshots && trade.screenshots.length > 0) {
  const screenshotMarkdown = trade.screenshots.map(s => `![](${s})`).join('\n');
  content = content.replace(/{screenshots}/g, screenshotMarkdown);
} else {
  content = content.replace(/{screenshots}/g, '_No screenshots available_');
}
```

### Array Handling
```javascript
// For YAML frontmatter arrays
if (Array.isArray(trade.screenshots)) {
  const yamlArray = trade.screenshots.map(s => `  - ${s}`).join('\n');
  content = content.replace(/screenshots:\n  - /g, `screenshots:\n${yamlArray}`);
}
```

## Scripts Using Templates

1. **import_csv.js** - Uses `trade.md.template` for CSV imports
2. **generate_week_summaries.js** - Uses `weekly-summary.md.template` for week summaries
3. **attach_media.js** - Updates screenshot arrays in existing trade files

## File Naming Conventions

### Trade Files
Format: `MM:DD:YYYY.N.md`
- `MM:DD:YYYY` - Trade exit date
- `N` - Sequence number for trades on same day (1, 2, 3, ...)
- Example: `11:15:2024.1.md` (first trade on Nov 15, 2024)

**Note**: Jekyll excludes files with colons by default. Add to `_config.yml`:
```yaml
include:
  - "_*.md"
  - "*:*.md"
```

### Week Summary Files
Format: `master.trade.md`
- Single file per week folder
- Located in `week.YYYY.WW/` (e.g., `week.2024.45/`)

### Week Folder Naming
Format: `week.YYYY.WW`
- `YYYY` - Year
- `WW` - ISO week number (01-53)
- Example: `week.2024.45` (week 45 of 2024)

## Migration Notes

These templates are part of the **client-side migration** from Python to JavaScript. Original templates in `.github/templates/` are preserved for reference.

**Key Changes**:
- Template processing moved from Python to JavaScript
- Variable replacement logic in `system/scripts/`
- Backward compatible with existing trade files

All templates maintain 100% compatibility with original Python implementation.

## Future Enhancements

Potential improvements:
1. **Template validation** - Validate variables before writing
2. **Multi-language support** - Localized templates
3. **Template versioning** - Schema migrations for templates
4. **Custom templates** - User-defined template overrides
5. **Template inheritance** - Base templates with extensions
