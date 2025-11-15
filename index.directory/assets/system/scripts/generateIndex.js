/**
 * Generate Index Script (JavaScript version)
 * Consolidates all parsed trade data and generates the master trades index
 * This is essentially a wrapper that ensures trades-index exists
 * 
 * This is a direct JavaScript port of .github/scripts/generate_index.py
 */

/**
 * Main function to generate master index
 * @returns {Promise<Object>} Result of index generation
 */
export async function generateIndex() {
  console.log('[GenerateIndex] Generating master trade index...');
  
  if (!window.PersonalPenniesDataAccess) {
    console.error('[GenerateIndex] DataAccess not initialized');
    return { status: 'error', message: 'DataAccess not initialized' };
  }
  
  try {
    // Check if trades-index exists
    const indexData = await window.PersonalPenniesDataAccess.loadTradesIndex();
    
    if (!indexData) {
      console.warn('[GenerateIndex] trades-index not found');
      console.warn('[GenerateIndex] This should be created by parseTrades()');
      return { status: 'warning', message: 'No trades-index found' };
    }
    
    const trades = indexData.trades || [];
    const stats = indexData.statistics || {};
    
    console.log(`[GenerateIndex] Master index contains ${trades.length} trade(s)`);
    console.log(`[GenerateIndex] Total P&L: $${stats.total_pnl || 0}`);
    console.log(`[GenerateIndex] Win Rate: ${stats.win_rate || 0}%`);
    
    console.log('[GenerateIndex] Master index is ready in VFS');
    
    return { 
      status: 'success', 
      trades: trades.length, 
      stats 
    };
    
  } catch (error) {
    console.error('[GenerateIndex] Error generating index:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Generate index and emit event
 */
export async function generateIndexAndEmit() {
  const result = await generateIndex();
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('index:generated', result);
  }
  
  return result;
}

// Alias for pipeline compatibility
export const generate = generateIndex;

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGenerateIndex = {
    generateIndex,
    generateIndexAndEmit,
    generate: generateIndex
  };
}

console.log('[GenerateIndex] Module loaded');
