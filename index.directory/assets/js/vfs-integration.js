/**
 * VFS Integration for app.js
 * 
 * Monkey-patches the TradingJournal class and other data loading functions
 * to use VFS data access instead of direct fetch() calls.
 * 
 * This allows us to keep the existing code mostly unchanged while
 * redirecting data access through VFS.
 */

(function() {
  'use strict';
  
  // Wait for required modules
  const originalInit = () => {
    if (typeof TradingJournal === 'undefined') {
      console.log('[VFS-Integration] Waiting for TradingJournal...');
      setTimeout(originalInit, 100);
      return;
    }
    
    if (!window.PersonalPenniesDataAccess) {
      console.log('[VFS-Integration] Waiting for DataAccess...');
      setTimeout(originalInit, 100);
      return;
    }
    
    console.log('[VFS-Integration] Patching TradingJournal for VFS...');
    
    const DataAccess = window.PersonalPenniesDataAccess;
    
    // Store original methods
    const originalLoadRecentTrades = TradingJournal.prototype.loadRecentTrades;
    
    /**
     * Patched loadRecentTrades - uses VFS if available, otherwise falls back
     */
    TradingJournal.prototype.loadRecentTrades = async function() {
      const container = document.getElementById('recent-trades');
      if (!container) return;
      
      try {
        let data = null;
        let analyticsData = null;
        
        // Try VFS first if available
        if (window.PersonalPenniesDataAccess) {
          try {
            data = await DataAccess.loadTradesIndex();
            analyticsData = await DataAccess.loadAnalytics();
            console.log('[VFS-Integration] Loaded data from VFS');
          } catch (vfsError) {
            console.log('[VFS-Integration] VFS not ready, falling back to original method');
          }
        }
        
        // If VFS didn't work, call original method
        if (!data) {
          return originalLoadRecentTrades.call(this);
        }
        
        const trades = data.trades || [];
        
        // Sort by date and get 3 most recent
        const recentTrades = trades
          .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
          .slice(0, 3);
        
        // Display trades
        container.innerHTML = recentTrades.map((trade, index) => 
          this.createTradeCard(trade, index)
        ).join('');
        
        // Update stats with analytics data
        this.updateStats(data.statistics || {}, analyticsData);
        
      } catch (error) {
        console.warn('Could not load trades:', error);
        container.innerHTML = `
          <div class="alert alert-warning">
            <p>No trades found yet. <a href="index.directory/add-trade.html">Add your first trade!</a></p>
          </div>
        `;
      }
    };
    
    console.log('[VFS-Integration] TradingJournal patched for VFS');
    
    // Patch global chart loading functions if they exist
    patchChartLoaders();
  };
  
  /**
   * Patch chart loading functions in analytics.js
   */
  function patchChartLoaders() {
    // DO NOT PATCH GLOBAL FETCH
    // The VFS adapter already has fallback logic built in
    // and patching fetch breaks the legacy seeding process
    console.log('[VFS-Integration] Skipping global fetch patch - using VFS adapter fallback instead');
  }
  
  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', originalInit);
  } else {
    originalInit();
  }
  
})();
