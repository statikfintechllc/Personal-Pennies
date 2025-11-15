# Python to JavaScript Mirror Plan

## Objective
Create PERFECT JavaScript mirrors of ALL Python files in `.github/scripts/`, mirroring EVERY function.

## Files to Mirror (23 total)

### Core Generation Scripts (11 files)
1. ✅ parse_trades.py → parseTrades.js
   - [ ] parse_frontmatter() - INCOMPLETE (needs YAML time sexagesimal bug handling)
   - [ ] parse_trade_file() - INCOMPLETE (needs all field conversions, notes extraction)
   - [ ] calculate_statistics() - INCOMPLETE (missing avg_winner, avg_loser, largest_win, largest_loss, max_drawdown, profit_factor)
   - [ ] main() - INCOMPLETE

2. ⏳ generate_analytics.py → generateAnalytics.js
   - Status: Needs audit

3. ⏳ generate_charts.py → generateCharts.js
   - Status: Needs audit

4. ⏳ generate_index.py → generateIndex.js
   - Status: Needs audit - must create all-trades.html

5. ⏳ generate_trade_pages.py → generateTradePages.js
   - Status: Needs audit - must create individual HTML files

6. ⏳ generate_week_summaries.py → generateWeekSummaries.js
   - Status: Needs audit - must create master.trade.md files

7. ⏳ generate_summaries.py → generateSummaries.js
   - Status: Needs audit

8. ⏳ generate_books_index.py → generateBooksIndex.js
   - Status: Needs audit

9. ⏳ generate_notes_index.py → generateNotesIndex.js
   - Status: Needs audit

10. ⏳ update_homepage.py → updateHomepage.js
    - Status: Needs audit

11. ⏳ navbar_template.py → navbarTemplate.js
    - Status: Needs audit

### Utility Scripts (4 files)
12. ⏳ utils.py → utils.js
    - Status: Needs audit

13. ⏳ globals_utils.py → globalsUtils.js
    - Status: Needs audit

14. ⏳ normalize_schema.py → normalizeSchema.js
    - Status: Needs audit

15. ⏳ attach_media.py → attachMedia.js
    - Status: Needs audit

### Import/Export Scripts (2 files)
16. ⏳ import_csv.py → importCSV.js
    - Status: Needs creation

17. ⏳ export_csv.py → exportCSV.js
    - Status: Needs creation

### Broker Importers (6 files)
18. ⏳ importers/__init__.py → importers/index.js
    - Status: Needs creation

19. ⏳ importers/base_importer.py → importers/baseImporter.js
    - Status: Needs creation

20. ⏳ importers/ibkr.py → importers/ibkr.js
    - Status: Needs creation

21. ⏳ importers/robinhood.py → importers/robinhood.js
    - Status: Needs creation

22. ⏳ importers/schwab.py → importers/schwab.js
    - Status: Needs creation

23. ⏳ importers/webull.py → importers/webull.js
    - Status: Needs creation

## Execution Strategy

1. **File-by-File Approach**
   - Read entire Python file
   - List ALL functions
   - Mirror EVERY function to JavaScript
   - Test each function
   - Commit when file is complete

2. **Function Mirroring Rules**
   - Copy ALL functions, not just main ones
   - Preserve ALL logic
   - Convert Python syntax to JavaScript
   - Maintain ALL error handling
   - Keep ALL comments and documentation

3. **Progress Tracking**
   - Update this file after each completed mirror
   - Mark functions as complete
   - Document any deviations from Python version

## Current Status
Working on: parse_trades.py
Files completed: 0/23
Functions mirrored: 0/~200

## Next Steps
1. Complete parse_trades.py mirror (ALL functions)
2. Move to generate_analytics.py
3. Continue through all 23 files systematically
