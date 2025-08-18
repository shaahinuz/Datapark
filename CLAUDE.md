# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Chrome Extension** (Manifest V3) called "IT Park Dashboard Helper" that extracts and compares data from IT Park dashboard websites (regions-stat.it-park.uz). The extension provides functionality to:

1. Save dashboard data from different time periods (general periods)
2. Save dashboard data from specific districts with district names
3. Compare metrics between two saved periods (period comparison)
4. Compare metrics between two saved districts (district comparison)
5. Export comparison data as CSV files for both types

## Architecture

The extension consists of 4 main files:

- **manifest.json**: Chrome extension configuration (permissions, content security policy)
- **popup.html**: Extension popup UI with sections for data saving, period comparison, and district comparison
- **popup.css**: Styling with gradient theme and responsive grid layouts  
- **popup.js**: Main logic (~970 lines) with data scraping, storage, comparison, and export functionality

### Key Components in popup.js:

- **Data Scraping**: `scrapeDashboardData()` extracts KPIs and company data from the IT Park dashboard
- **Dual Storage System**: Separate storage for periods (`period_*`) and districts (`district_*`)
- **Period Management**: Functions to save/load different time periods for comparison
- **District Management**: Functions to save/load district-specific data with dynamic filtering by district name
- **Comparison Engine**: `analyzeCompanyChanges()` compares metrics between two datasets
- **Export Functions**: CSV generation for both period and district comparisons
- **Storage**: Uses Chrome extension storage API with prefixed keys for organization

## Development Commands

This is a pure client-side Chrome extension with no build process. Development workflow:

### Loading the Extension:
1. Open `chrome://extensions/`
2. Enable "Developer mode"  
3. Click "Load unpacked" and select this directory

### Testing:
- Test by navigating to IT Park dashboard (regions-stat.it-park.uz)
- Use browser DevTools console (F12) for debugging
- Extension logs are visible in popup DevTools (right-click popup → Inspect)

### Permissions:
The extension requires access to `*.it-park.uz` domains and uses:
- `activeTab`: Access current tab content
- `scripting`: Inject content scripts for data scraping
- `storage`: Persist saved dashboard data
- `tabs`: Manage tab navigation for district collection

## Key Files to Modify:

- **popup.js**: Core functionality, data scraping logic, export features
- **popup.html**: UI structure and form elements
- **popup.css**: Styling and layout (uses CSS Grid extensively)
- **manifest.json**: Permissions and extension metadata (careful with CSP changes)

## Testing Notes:

- Test data scraping on actual IT Park dashboard pages
- Test period comparison functionality between different time periods  
- Test district comparison functionality between different districts/periods
- Test CSV export functionality for both comparison types
- Verify separate storage systems work correctly (periods vs districts)
- Check storage persistence across browser sessions
- Validate cross-browser compatibility (Chrome/Edge focus)

