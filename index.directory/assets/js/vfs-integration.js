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
     * Patched loadRecentTrades - uses VFS instead of fetch
     */
    TradingJournal.prototype.loadRecentTrades = async function() {
      const container = document.getElementById('recent-trades');
      if (!container) return;
      
      try {
        // Load trades from VFS instead of fetch
        const data = await DataAccess.loadTradesIndex();
        const trades = data.trades || [];
        
        // Sort by date and get 3 most recent
        const recentTrades = trades
          .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
          .slice(0, 3);
        
        // Display trades
        container.innerHTML = recentTrades.map((trade, index) => 
          this.createTradeCard(trade, index)
        ).join('');
        
        // Load analytics from VFS
        let analyticsData = null;
        try {
          analyticsData = await DataAccess.loadAnalytics();
        } catch (err) {
          console.warn('Could not load analytics data:', err);
        }
        
        // Update stats with analytics data
        this.updateStats(data.statistics || {}, analyticsData);
        
        console.log('[VFS-Integration] Loaded recent trades from VFS');
        
      } catch (error) {
        console.warn('Could not load trades from VFS:', error);
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
    const DataAccess = window.PersonalPenniesDataAccess;
    
    // Create a wrapper for fetch that redirects chart requests through VFS
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options) {
      // Only intercept JSON requests to our app paths
      if (typeof url === 'string' && url.includes('.json')) {
        const chartPatterns = [
          'equity-curve-data',
          'win-loss-ratio-by-strategy-data',
          'performance-by-day-data',
          'ticker-performance-data',
          'time-of-day-performance-data',
          'portfolio-value-',
          'total-return-',
          'analytics-data',
          'trades-index',
          'account-config',
          'notes-index'
        ];
        
        const matchesPattern = chartPatterns.some(pattern => url.includes(pattern));
        
        if (matchesPattern) {
          console.log(`[VFS-Integration] Intercepting fetch: ${url}`);
          
          // Extract chart name from URL
          let path = url;
          if (path.includes('://')) {
            const urlObj = new URL(path);
            path = urlObj.pathname;
          }
          
          // Remove leading slash and base path
          path = path.replace(/^\/+/, '');
          
          try {
            // Try VFS first
            if (window.PersonalPenniesVFSAdapter) {
              return await window.PersonalPenniesVFSAdapter.vfsFetch(path);
            }
          } catch (error) {
            console.warn(`[VFS-Integration] VFS fetch failed for ${path}, falling back to original fetch:`, error);
          }
        }
      }
      
      // Fall back to original fetch
      return originalFetch.call(window, url, options);
    };
    
    console.log('[VFS-Integration] Patched global fetch for VFS');
  }
  
  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', originalInit);
  } else {
    originalInit();
  }
  
})();
