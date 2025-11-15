# System Workflows

This directory contains client-side workflow files that define automated processes for the Personal-Pennies trading journal system.

## Available Workflows

### 1. `trade_pipeline.yml.disabled`
**Purpose**: Main trade processing pipeline

**Triggers**:
- Push to `index.directory/SFTi.Tradez/**`
- Push to trade-related directories (assets, books, notes)
- Manual workflow dispatch

**Process Steps**:
1. Parse trades into JSON index
2. Generate books index
3. Generate notes index
4. Generate summaries (weekly/monthly/yearly)
5. Generate master index
6. Generate charts (Chart.js data)
7. Generate analytics
8. Generate trade detail pages
9. Generate week summaries
10. Update homepage
11. Optimize images
12. Commit and push generated files

**Dependencies**:
- Node.js runtime (for JavaScript scripts)
- System scripts in `system/scripts/`

### 2. `import.yml.disabled`
**Purpose**: CSV import workflow for broker trade data

**Triggers**:
- Push to `import/*.csv` files
- Manual workflow dispatch with CSV file path

**Process Steps**:
1. Find CSV files in `import/` directory
2. Auto-detect broker or use specified broker
3. Parse CSV using broker-specific importer
4. Create trade markdown files
5. Commit imported trades (triggers trade_pipeline)

**Supported Brokers**:
- Interactive Brokers (IBKR)
- Charles Schwab / TD Ameritrade
- Robinhood
- Webull

**Dependencies**:
- `system/scripts/import_csv.js`
- `system/scripts/importers/` (broker parsers)

### 3. `site-submit.yml.disabled`
**Purpose**: Pull request workflow for trade submissions

**Triggers**:
- Manual workflow dispatch
- Repository dispatch events

**Process Steps**:
1. Create submission branch
2. Stage pending changes from `pending-submissions/`
3. Commit changes
4. Create pull request
5. Trigger trade pipeline on merge

**Use Case**: Multi-contributor workflows where trades are reviewed before integration

## Usage Notes

### Enabling Workflows

These workflows are currently disabled (`.disabled` extension). To enable:

1. **For GitHub Actions**: Remove `.disabled` extension and place in `.github/workflows/`
2. **For Client-Side Execution**: Use Node.js to execute the scripts directly:
   ```bash
   node system/scripts/parse_trades.js
   node system/scripts/import_csv.js <file.csv> --broker ibkr
   ```

### Workflow Dependencies

All workflows depend on:
- `system/scripts/` - JavaScript implementations of all automation
- `system/templates/` - Markdown templates for trade and summary files
- `index.directory/` - Data directory structure

### Converting to JavaScript/Node.js

These workflows were originally written for Python scripts. They can be adapted for JavaScript by:

1. Replace `python .github/scripts/xxx.py` with `node system/scripts/xxx.js`
2. Replace Python dependencies with npm packages
3. Update image optimization commands for Node.js tools

### Local Development

Run scripts locally without workflows:

```bash
# Parse trades
node system/scripts/parse_trades.js

# Import CSV
node system/scripts/import_csv.js broker-data.csv --broker schwab

# Generate all outputs
node system/scripts/generate_index.js
node system/scripts/generate_analytics.js
node system/scripts/generate_charts.js
node system/scripts/generate_summaries.js
node system/scripts/generate_trade_pages.js
node system/scripts/generate_week_summaries.js
node system/scripts/update_homepage.js
```

## Workflow Customization

### Modifying Paths

Update these path patterns in workflows:
- `index.directory/SFTi.Tradez/**` - Trade file location
- `index.directory/assets/` - Asset file location
- `import/*.csv` - CSV import location

### Adding New Steps

To extend workflows:
1. Create new script in `system/scripts/`
2. Add step to workflow YAML
3. Update dependencies if needed

### Performance Optimization

For large trade volumes:
- Run workflows conditionally (only on relevant changes)
- Cache dependencies between workflow runs
- Optimize script execution order

## Migration Notes

This directory represents the **client-side migration** of GitHub Actions workflows. The original Python-based workflows in `.github/workflows/` are preserved for reference.

**Key Changes**:
- Python scripts → JavaScript/Node.js scripts
- Server-side execution → Client-side execution capability
- PyYAML, matplotlib → js-yaml (optional), Chart.js

All workflows maintain 100% feature parity with original Python implementations.
