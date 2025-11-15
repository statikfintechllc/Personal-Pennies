/**
 * Update Homepage Script (JavaScript version)
 * Updates the index.html with the most recent trades
 * In browser context, this just ensures data is available
 * 
 * This is a direct JavaScript port of .github/scripts/update_homepage.py
 */

/**
 * Main function to update homepage data
 * @returns {Promise<Object>} Result of homepage update
 */
export async function updateHomepage() {
  console.log('[UpdateHomepage] Updating homepage with recent trades...');
  
  if (!window.PersonalPenniesDataAccess) {
    console.error('[UpdateHomepage] DataAccess not initialized');
    return { status: 'error', message: 'DataAccess not initialized' };
  }
  
  try {
    // Load trades index
    const indexData = await window.PersonalPenniesDataAccess.loadTradesIndex();
    
    if (!indexData) {
      console.warn('[UpdateHomepage] Could not load trades index');
      return { status: 'warning', message: 'No trades index' };
    }
    
    const trades = indexData.trades || [];
    const stats = indexData.statistics || {};
    
    console.log(`[UpdateHomepage] Trades index contains ${trades.length} trade(s)`);
    console.log(`[UpdateHomepage] Statistics: Win Rate: ${stats.win_rate || 0}%, Total P&L: $${stats.total_pnl || 0}`);
    
    // In browser context, the homepage uses JavaScript to dynamically load data
    // So we just need to ensure the data is in VFS
    console.log('[UpdateHomepage] Homepage will load data via JavaScript');
    console.log('[UpdateHomepage] trades-index is ready in VFS');
    
    // Emit event so homepage can refresh
    if (window.SFTiEventBus) {
      window.SFTiEventBus.emit('homepage:update', { trades, stats });
    }
    
    return { 
      status: 'success', 
      trades: trades.length, 
      stats 
    };
    
  } catch (error) {
    console.error('[UpdateHomepage] Error updating homepage:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Update homepage and emit event
 */
export async function updateHomepageAndEmit() {
  const result = await updateHomepage();
  
  // Emit event (if needed in future)
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('homepage:updated', result);
  }
  
  return result;
}

// Alias for pipeline compatibility
export const update = updateHomepage;

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesUpdateHomepage = {
    updateHomepage,
    updateHomepageAndEmit,
    update: updateHomepage
  };
}

console.log('[UpdateHomepage] Module loaded');
