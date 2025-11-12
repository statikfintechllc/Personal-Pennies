/**
 * Import/Export Utility
 * Handles backup and restoration of all IndexedDB data
 */

import { exportAllData, importAllData, clearAllStores } from '../storage/db.js';

/**
 * Export all data as JSON file (download)
 */
export async function exportToFile() {
  console.log('[ImportExport] Exporting data...');
  
  try {
    const data = await exportAllData();
    
    // Create a blob and download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-pennies-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[ImportExport] Export complete');
    return { status: 'success', message: 'Data exported successfully' };
  } catch (error) {
    console.error('[ImportExport] Export failed:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Import data from JSON file
 * @param {File} file - JSON file to import
 * @param {boolean} clearFirst - Whether to clear existing data first
 */
export async function importFromFile(file, clearFirst = false) {
  console.log('[ImportExport] Importing data...');
  
  try {
    // Read file
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate data
    if (!data.stores || !data.version) {
      throw new Error('Invalid backup file format');
    }
    
    // Clear existing data if requested
    if (clearFirst) {
      console.log('[ImportExport] Clearing existing data...');
      await clearAllStores();
    }
    
    // Import data
    await importAllData(data);
    
    console.log('[ImportExport] Import complete');
    
    // Emit event to trigger pipeline
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('data:imported', { clearFirst });
      window.SFTiEventBus.emit('pipeline:run', { trigger: 'data:imported' });
    }
    
    return { status: 'success', message: 'Data imported successfully' };
  } catch (error) {
    console.error('[ImportExport] Import failed:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Export trades to CSV format
 * @returns {string} CSV content
 */
export async function exportTradesToCSV() {
  console.log('[ImportExport] Exporting trades to CSV...');
  
  try {
    const { getAllTrades } = await import('../storage/db.js');
    const trades = await getAllTrades();
    
    if (trades.length === 0) {
      return { status: 'error', message: 'No trades to export' };
    }
    
    // CSV headers
    const headers = [
      'trade_number',
      'ticker',
      'entry_date',
      'entry_time',
      'exit_date',
      'exit_time',
      'entry_price',
      'exit_price',
      'position_size',
      'direction',
      'strategy',
      'stop_loss',
      'target_price',
      'broker',
      'pnl_usd',
      'pnl_percent',
      'notes'
    ];
    
    // Build CSV content
    let csv = headers.join(',') + '\n';
    
    for (const trade of trades) {
      const row = headers.map(header => {
        let value = trade[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      });
      csv += row.join(',') + '\n';
    }
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[ImportExport] CSV export complete');
    return { status: 'success', message: 'Trades exported to CSV successfully' };
  } catch (error) {
    console.error('[ImportExport] CSV export failed:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Create UI for import/export
 */
export function createImportExportUI() {
  const container = document.createElement('div');
  container.id = 'import-export-ui';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: var(--bg-secondary, #1a1a1a);
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 1000;
  `;
  
  container.innerHTML = `
    <h4 style="margin: 0 0 1rem 0; color: var(--text-primary, #fff);">Data Management</h4>
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <button id="export-json-btn" class="btn btn-secondary" style="width: 100%;">
        Export Backup (JSON)
      </button>
      <button id="export-csv-btn" class="btn btn-secondary" style="width: 100%;">
        Export Trades (CSV)
      </button>
      <label for="import-file-input" class="btn btn-primary" style="width: 100%; text-align: center; cursor: pointer;">
        Import Backup
      </label>
      <input type="file" id="import-file-input" accept=".json" style="display: none;">
    </div>
  `;
  
  document.body.appendChild(container);
  
  // Event listeners
  document.getElementById('export-json-btn').addEventListener('click', async () => {
    const result = await exportToFile();
    alert(result.message);
  });
  
  document.getElementById('export-csv-btn').addEventListener('click', async () => {
    const result = await exportTradesToCSV();
    alert(result.message);
  });
  
  document.getElementById('import-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const confirm = window.confirm('Import data? This will merge with existing data. Clear existing data first?');
    const result = await importFromFile(file, confirm);
    alert(result.message);
    
    if (result.status === 'success') {
      window.location.reload();
    }
  });
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesImportExport = {
    exportToFile,
    importFromFile,
    exportTradesToCSV,
    createImportExportUI
  };
}

console.log('[ImportExport] Import/Export module loaded');
