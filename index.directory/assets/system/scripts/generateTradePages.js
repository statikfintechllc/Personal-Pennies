/**
 * Generate Trade Detail Pages Script (JavaScript version)
 * Creates individual HTML pages for each trade with full details, charts, and media
 * 
 * This is a COMPLETE JavaScript port of .github/scripts/generate_trade_pages.py (379 lines)
 * Full HTML template generation implemented
 * 
 * Features:
 * - Generates responsive HTML pages with trade metrics
 * - Displays P&L, risk management, and trade details
 * - Includes image galleries with GLightbox integration
 * - Shows strategy and setup tags
 * - Mobile-friendly design with dark theme
 * 
 * Note: In browser context, HTML pages are generated dynamically rather than as files
 * Trade details can be rendered directly or saved to IndexedDB for offline access
 */

/**
 * Generate tag badges HTML
 * @param {Array<string>} tags - Array of tag strings
 * @param {string} color - Background color for tags
 * @returns {string} HTML for tag badges
 */
function renderTags(tags, color) {
  if (!tags || tags.length === 0) {
    return '<span style="color: var(--text-secondary); font-style: italic;">None</span>';
  }
  
  return tags.map(tag =>
    `<span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${color}; color: white; border-radius: 4px; font-size: 0.875rem; margin-right: 0.5rem; margin-bottom: 0.5rem;">${tag}</span>`
  ).join('');
}

/**
 * Generate image gallery HTML
 * @param {Array<string>} images - Array of image paths
 * @param {number} tradeNumber - Trade number for gallery grouping
 * @returns {string} HTML for image gallery
 */
function generateGalleryHtml(images, tradeNumber) {
  if (!images || images.length === 0) {
    return `
    <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
      <h2 style="margin-bottom: 1rem;">📸 Screenshots</h2>
      <p style="color: var(--text-secondary); margin: 0;">No screenshots available for this trade.</p>
    </div>`;
  }
  
  const galleryItems = images
    .filter(img => img && img !== 'None' && img.trim())
    .map((img, idx) => {
      const imgPath = img.replace('../../assets/', '../assets/');
      return `
      <a href="${imgPath}" class="glightbox" data-gallery="trade-${tradeNumber}">
        <img src="${imgPath}" alt="Trade screenshot ${idx + 1}" style="width: 200px; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid var(--border-color); transition: all 0.3s;">
      </a>`;
    }).join('');
  
  if (!galleryItems) {
    return `
    <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
      <h2 style="margin-bottom: 1rem;">📸 Screenshots</h2>
      <p style="color: var(--text-secondary); margin: 0;">No screenshots available for this trade.</p>
    </div>`;
  }
  
  return `
  <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
    <h2 style="margin-bottom: 1rem;">📸 Screenshots</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
      ${galleryItems}
    </div>
  </div>`;
}

/**
 * Generate HTML for a single trade detail page with full details
 * @param {Object} trade - Trade dictionary
 * @returns {string} HTML content
 */
export function generateTradeHtml(trade) {
  // Extract trade data
  const tradeNumber = trade.trade_number || 0;
  const ticker = trade.ticker || 'UNKNOWN';
  const entryDate = trade.entry_date || '';
  const entryTime = trade.entry_time || '';
  const exitDate = trade.exit_date || '';
  const exitTime = trade.exit_time || '';
  const entryPrice = trade.entry_price || 0;
  const exitPrice = trade.exit_price || 0;
  const positionSize = trade.position_size || 0;
  const pnlUsd = trade.pnl_usd || 0;
  const pnlPercent = trade.pnl_percent || 0;
  const direction = trade.direction || 'LONG';
  const strategy = trade.strategy || 'Unknown';
  const stopLoss = trade.stop_loss || 0;
  const targetPrice = trade.target_price || 0;
  const riskRewardRatio = trade.risk_reward_ratio || 0;
  const broker = trade.broker || 'Unknown';
  const notes = trade.notes || 'No notes recorded.';

  // Get tags (v1.1 schema)
  const strategyTags = trade.strategy_tags || [];
  const setupTags = trade.setup_tags || [];
  const sessionTags = trade.session_tags || [];
  const marketConditionTags = trade.market_condition_tags || [];

  // Get images
  let images = trade.images || [];
  const screenshots = trade.screenshots || [];
  if (images.length === 0 && screenshots.length > 0) {
    images = Array.isArray(screenshots) ? screenshots : [];
  }

  // Calculate additional metrics
  const timeInTrade = window.PersonalPenniesGlobals?.calculateTimeInTrade?.(
    entryDate, entryTime, exitDate, exitTime
  ) || 'Unknown';

  // Generate gallery HTML
  const galleryHtml = generateGalleryHtml(images, tradeNumber);
  
  // Generate navbar
  const navbarHtml = window.PersonalPenniesNavbarTemplate?.getNavbarHtml?.('subdirectory') || 
    '<!-- Navigation - Generated by navbar.js -->';

  // Generate full HTML template
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="description" content="Trade #${tradeNumber} - ${ticker} details and analysis">
  <meta name="theme-color" content="#00ff88">
  
  <title>Trade #${tradeNumber} - ${ticker} - SFTi-Pennies</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- GLightbox CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/glightbox/dist/css/glightbox.min.css">
  
  <!-- Custom Styles -->
  <link rel="stylesheet" href="../assets/css/main.css">
  <link rel="stylesheet" href="../assets/css/glass-effects.css">
  <link rel="stylesheet" href="../assets/css/glowing-bubbles.css">
  
  <!-- PWA Manifest -->
  <link rel="manifest" href="../../manifest.json">
  
  <!-- Icons -->
  <link rel="icon" type="image/png" sizes="192x192" href="../assets/icons/icon-192.png">
</head>
<body>
  <canvas id="bg-canvas"></canvas>
  
${navbarHtml}
  
  <!-- Main Content -->
  <main class="container">
    <section>
      <!-- Header -->
      <div style="margin-bottom: 2rem;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
          <h1 style="margin: 0;">Trade #${tradeNumber}: ${ticker}</h1>
          <span style="padding: 0.375rem 1rem; background: ${pnlUsd >= 0 ? 'rgba(0,255,136,0.2)' : 'rgba(255,71,87,0.2)'}; color: ${pnlUsd >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; border-radius: 6px; font-weight: 700; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">
            ${pnlUsd >= 0 ? '🎯 WIN' : '❌ LOSS'}
          </span>
        </div>
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <p style="color: var(--text-secondary); margin: 0;">${strategy} | ${direction}</p>
          <span style="color: var(--text-secondary);">•</span>
          <p style="color: var(--text-secondary); margin: 0;">${broker}</p>
        </div>
      </div>
      
      <!-- Key Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 8px; border: 2px solid ${pnlUsd >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">P&L (USD)</div>
          <div style="font-family: var(--font-mono); font-size: 2rem; font-weight: 700; color: ${pnlUsd >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
            $${pnlUsd.toFixed(2)}
          </div>
        </div>
        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">P&L (%)</div>
          <div style="font-family: var(--font-mono); font-size: 2rem; font-weight: 700; color: ${pnlPercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%
          </div>
        </div>
        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Position Size</div>
          <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 600;">
            ${positionSize} shares
          </div>
        </div>
        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: 8px;">
          <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Time in Trade</div>
          <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 600;">
            ${timeInTrade}
          </div>
        </div>
      </div>
      
      <!-- Trade Details -->
      <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="margin-bottom: 1.5rem;">📊 Trade Details</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
          <div>
            <h3 style="font-size: 0.875rem; color: var(--accent-green); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">Entry</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Price:</span>
                <span style="font-family: var(--font-mono); font-weight: 600;">$${entryPrice.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Date:</span>
                <span style="font-family: var(--font-mono);">${entryDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Time:</span>
                <span style="font-family: var(--font-mono);">${entryTime}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 style="font-size: 0.875rem; color: var(--accent-red); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">Exit</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Price:</span>
                <span style="font-family: var(--font-mono); font-weight: 600;">$${exitPrice.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Date:</span>
                <span style="font-family: var(--font-mono);">${exitDate}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Time:</span>
                <span style="font-family: var(--font-mono);">${exitTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Risk Management -->
      <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="margin-bottom: 1.5rem;">🎯 Risk Management</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
          <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Stop Loss</div>
            <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 600; color: var(--accent-red);">
              $${stopLoss.toFixed(2)}
            </div>
          </div>
          <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Target Price</div>
            <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 600; color: var(--accent-green);">
              $${targetPrice.toFixed(2)}
            </div>
          </div>
          <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Risk:Reward Ratio</div>
            <div style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 600; color: var(--accent-yellow);">
              1:${riskRewardRatio.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tags Section -->
      <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="margin-bottom: 1.5rem;">🏷️ Tags & Classification</h2>
        <div style="display: grid; gap: 1rem;">
          <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Strategy Tags:</div>
            <div>${renderTags(strategyTags, 'var(--accent-green)')}</div>
          </div>
          <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Setup Tags:</div>
            <div>${renderTags(setupTags, 'var(--accent-blue)')}</div>
          </div>
          <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Session Tags:</div>
            <div>${renderTags(sessionTags, 'var(--accent-yellow)')}</div>
          </div>
          <div>
            <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Market Condition Tags:</div>
            <div>${renderTags(marketConditionTags, 'var(--accent-red)')}</div>
          </div>
        </div>
      </div>
      
      <!-- Screenshots Gallery -->
      ${galleryHtml}
      
      <!-- Notes Section -->
      <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
        <h2 style="margin-bottom: 1rem;">📝 Notes & Journal</h2>
        <div style="line-height: 1.8; color: var(--text-primary);">
          ${notes.replace(/\n/g, '<br>')}
        </div>
      </div>
      
    </section>
  </main>
  
  <!-- Footer - Generated by footer.js -->
  
  <!-- GLightbox JS -->
  <script src="https://cdn.jsdelivr.net/gh/mcstudios/glightbox/dist/js/glightbox.min.js"></script>
  <script>
    // Initialize GLightbox for image gallery
    const lightbox = GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      autoplayVideos: true
    });
  </script>
  
  <!-- Load shared utilities first -->
  <script src="../assets/js/utils.js"></script>
  <script src="../assets/js/chartConfig.js"></script>
  
  <!-- Application scripts -->
  <script src="../assets/js/navbar.js"></script>
  <script src="../assets/js/footer.js"></script>
  <script src="../assets/js/background.js"></script>
  <script src="../assets/js/auth.js"></script>
  <script src="../assets/js/app.js"></script>
  <script src="../assets/js/glowing-bubbles.js"></script>
</body>
</html>`;

  return html;
}

/**
 * Generate HTML pages for all trades
 * @returns {Promise<Object>} Result of trade page generation
 */
export async function generateTradePages() {
  console.log('[GenerateTradePages] Generating trade detail pages...');
  
  if (!window.PersonalPenniesDB) {
    console.error('[GenerateTradePages] DB not initialized');
    return { status: 'error', message: 'DB not initialized' };
  }
  
  try {
    // Load trades index
    const tradesIndex = await window.PersonalPenniesDB.getIndex('trades-index');
    
    if (!tradesIndex || !tradesIndex.trades) {
      console.warn('[GenerateTradePages] No trades found');
      return { status: 'skipped', message: 'No trades' };
    }
    
    const trades = tradesIndex.trades;
    console.log(`[GenerateTradePages] Processing ${trades.length} trade(s)...`);
    
    const generatedPages = [];
    
    // Generate HTML for each trade
    for (const trade of trades) {
      const tradeNumber = trade.trade_number || 0;
      const ticker = trade.ticker || 'UNKNOWN';
      
      // Generate HTML
      const htmlContent = generateTradeHtml(trade);
      
      // In browser context, save HTML to IndexedDB or create Blob
      // For now, we'll store metadata about generated pages
      const pageData = {
        trade_number: tradeNumber,
        ticker: ticker,
        filename: `trade-${String(tradeNumber).padStart(3, '0')}-${ticker}.html`,
        html: htmlContent,
        generated_at: new Date().toISOString()
      };
      
      generatedPages.push(pageData);
      
      // Save individual page to trades store (for Service Worker to serve)
      await window.PersonalPenniesDB.saveTrade(`page-trade-${String(tradeNumber).padStart(3, '0')}-${ticker}`, pageData);
      
      console.log(`[GenerateTradePages] Generated: trade-${String(tradeNumber).padStart(3, '0')}-${ticker}.html`);
    }
    
    // Save metadata to IndexedDB
    await window.PersonalPenniesDB.saveIndex('trade-pages-index', {
      pages: generatedPages.map(p => ({
        trade_number: p.trade_number,
        ticker: p.ticker,
        filename: p.filename,
        generated_at: p.generated_at
      })),
      total_count: generatedPages.length,
      generated_at: new Date().toISOString()
    });
    
    console.log(`[GenerateTradePages] Generated ${generatedPages.length} trade detail page(s)`);
    
    return { 
      status: 'success', 
      count: generatedPages.length,
      pages: generatedPages
    };
    
  } catch (error) {
    console.error('[GenerateTradePages] Error generating trade pages:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Generate trade pages and emit event
 */
export async function generateTradePagesAndEmit() {
  const result = await generateTradePages();
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('trade-pages:generated', result);
  }
  
  return result;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesGenerateTradePages = {
    generateTradePages,
    generateTradePagesAndEmit,
    generateTradeHtml
  };
}

console.log('[GenerateTradePages] Module loaded - FULL implementation');
