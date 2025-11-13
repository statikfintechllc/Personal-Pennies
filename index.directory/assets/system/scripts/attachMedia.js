/**
 * Attach Media Script (JavaScript version)
 * Validates and reconciles media file references in trade metadata
 * 
 * This is a COMPLETE JavaScript port of .github/scripts/attach_media.py (444 lines)
 * All media management functions fully implemented
 * 
 * This script provides media management functionality:
 * 1. Scans IndexedDB media store for images
 * 2. Validates that trade metadata references are correct
 * 3. Updates trade data with image paths
 * 4. Reports orphaned images (not linked to any trade)
 * 5. Validates image files (existence, format, size)
 */

/**
 * Scan for trade images in IndexedDB media store
 * @returns {Promise<Object>} {trade_id: [image_data]}
 */
async function scanTradeImages() {
  if (!window.PersonalPenniesDB) {
    console.error('[AttachMedia] DB not initialized');
    return {};
  }

  try {
    const allMedia = await window.PersonalPenniesDB.getAllMedia();
    const tradeImages = {};

    for (const mediaEntry of allMedia) {
      const tradeId = mediaEntry._key || mediaEntry.trade_id;
      if (!tradeId) continue;

      const images = mediaEntry.files || mediaEntry.images || [];
      if (images.length > 0) {
        tradeImages[tradeId] = images;
      }
    }

    return tradeImages;
  } catch (error) {
    console.error('[AttachMedia] Error scanning trade images:', error);
    return {};
  }
}

/**
 * Validate that an image file exists and is accessible
 * In browser context, validate image data/blob
 * 
 * @param {Object} trade - Trade dictionary
 * @param {Object} imageData - Image data object
 * @returns {Object} {isValid: boolean, message: string|null}
 */
function validateImageReferences(trade, imageData) {
  if (!imageData) {
    return { isValid: false, message: 'Image data is null' };
  }

  // Check if image has required fields
  if (!imageData.filename && !imageData.url && !imageData.data) {
    return { isValid: false, message: 'Image missing filename, URL, or data' };
  }

  // Check file size if available (warn if > 5MB, but still valid)
  let warningMessage = null;
  if (imageData.size) {
    const sizeMB = imageData.size / (1024 * 1024);
    if (sizeMB > 5) {
      warningMessage = `Warning: Large image file (${sizeMB.toFixed(1)}MB)`;
    }
  }

  // Verify image format by extension or type
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  let hasValidFormat = false;
  
  if (imageData.filename) {
    const ext = imageData.filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
    if (ext) hasValidFormat = true;
  }
  
  if (imageData.type && validMimeTypes.includes(imageData.type)) {
    hasValidFormat = true;
  }

  if (!hasValidFormat) {
    return { isValid: false, message: 'Unsupported image format' };
  }

  return { isValid: true, message: warningMessage };
}

/**
 * Update trade metadata with image references
 * 
 * @param {string} tradeKey - Trade key in IndexedDB
 * @param {Array} imagePaths - List of image paths/data
 * @returns {Promise<boolean>} True if successful
 */
async function updateTradeMetadata(tradeKey, imagePaths) {
  if (!window.PersonalPenniesDB) {
    console.error('[AttachMedia] DB not initialized');
    return false;
  }

  try {
    // Load trade
    const trade = await window.PersonalPenniesDB.getTrade(tradeKey);
    if (!trade) {
      console.warn(`[AttachMedia] Trade not found: ${tradeKey}`);
      return false;
    }

    // Update images/screenshots field
    trade.images = imagePaths;
    trade.screenshots = imagePaths; // Keep both for compatibility
    trade.media_updated_at = new Date().toISOString();

    // Save trade back
    await window.PersonalPenniesDB.saveTrade(tradeKey, trade);
    
    console.log(`[AttachMedia] ✓ Updated ${imagePaths.length} image(s) for trade ${tradeKey}`);
    return true;
  } catch (error) {
    console.error(`[AttachMedia] Error updating trade ${tradeKey}:`, error);
    return false;
  }
}

/**
 * Find orphaned images (not linked to any trade)
 * 
 * @param {Object} tradeImages - Map of trade_id to images
 * @param {Array} trades - List of all trades
 * @returns {Array} List of orphaned image references
 */
function findOrphanedImages(tradeImages, trades) {
  const orphaned = [];
  const tradeIds = new Set(trades.map(t => 
    t._key || t.trade_number || `${t.entry_date}_${t.ticker}`
  ));

  for (const [tradeId, images] of Object.entries(tradeImages)) {
    if (!tradeIds.has(tradeId)) {
      orphaned.push({
        trade_id: tradeId,
        images: images,
        reason: 'Trade not found in index'
      });
    }
  }

  return orphaned;
}

/**
 * Generate validation report
 * 
 * @param {Object} tradeImages - Map of trade_id to images
 * @param {Array} trades - List of all trades
 * @param {Array} orphaned - List of orphaned images
 * @param {Array} updatedFiles - List of updated trade files
 * @returns {Object} Validation report
 */
function generateValidationReport(tradeImages, trades, orphaned, updatedFiles) {
  const totalImages = Object.values(tradeImages).reduce((sum, imgs) => sum + imgs.length, 0);
  const tradesWithImages = Object.keys(tradeImages).length;
  const tradesWithoutImages = trades.length - tradesWithImages;

  return {
    total_trades: trades.length,
    trades_with_images: tradesWithImages,
    trades_without_images: tradesWithoutImages,
    total_images: totalImages,
    orphaned_images: orphaned.length,
    updated_files: updatedFiles.length,
    images_per_trade_avg: tradesWithImages > 0 ? (totalImages / tradesWithImages).toFixed(2) : 0,
    orphaned_details: orphaned
  };
}

/**
 * Attach media files to trades (main function)
 * @param {boolean} dryRun - If true, only validate without modifying
 * @returns {Promise<Object>} Result of media attachment
 */
export async function attachMedia(dryRun = false) {
  console.log('[AttachMedia] Attaching media to trades...');
  console.log(`[AttachMedia] Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify data)'}`);
  
  if (!window.PersonalPenniesDB) {
    console.error('[AttachMedia] DB not initialized');
    return { status: 'error', message: 'DB not initialized' };
  }
  
  try {
    // Scan for trade images
    console.log('[AttachMedia] Scanning for trade images...');
    const tradeImages = await scanTradeImages();
    console.log(`[AttachMedia] Found ${Object.keys(tradeImages).length} trade(s) with images`);

    // Load trades index
    const tradesIndex = await window.PersonalPenniesDB.getIndex('trades-index');
    if (!tradesIndex || !tradesIndex.trades) {
      console.warn('[AttachMedia] No trades found');
      return { status: 'skipped', message: 'No trades' };
    }

    const trades = tradesIndex.trades;
    
    // Validate images and update trades
    const updatedFiles = [];
    const validationErrors = [];

    for (const [tradeId, images] of Object.entries(tradeImages)) {
      console.log(`[AttachMedia] Processing ${images.length} image(s) for trade ${tradeId}...`);
      
      // Find corresponding trade
      const trade = trades.find(t => 
        (t._key || t.trade_number || `${t.entry_date}_${t.ticker}`) === tradeId
      );

      if (!trade) {
        console.warn(`[AttachMedia] Trade not found for images: ${tradeId}`);
        continue;
      }

      // Validate each image
      for (const image of images) {
        const validation = validateImageReferences(trade, image);
        if (!validation.isValid) {
          validationErrors.push({
            trade_id: tradeId,
            image: image.filename || 'unknown',
            error: validation.message
          });
          console.warn(`[AttachMedia] ⚠️  ${validation.message}`);
        } else if (validation.message) {
          console.warn(`[AttachMedia] ⚠️  ${validation.message}`);
        }
      }

      // Update trade metadata if not dry run
      if (!dryRun) {
        const imagePaths = images.map(img => img.url || img.filename || img.data);
        const success = await updateTradeMetadata(tradeId, imagePaths);
        if (success) {
          updatedFiles.push(tradeId);
        }
      }
    }

    // Find orphaned images
    const orphaned = findOrphanedImages(tradeImages, trades);
    if (orphaned.length > 0) {
      console.warn(`[AttachMedia] Found ${orphaned.length} orphaned image(s)`);
    }

    // Generate report
    const report = generateValidationReport(tradeImages, trades, orphaned, updatedFiles);
    
    console.log('[AttachMedia] ===== Media Attachment Report =====');
    console.log(`[AttachMedia] Total Trades: ${report.total_trades}`);
    console.log(`[AttachMedia] Trades with Images: ${report.trades_with_images}`);
    console.log(`[AttachMedia] Trades without Images: ${report.trades_without_images}`);
    console.log(`[AttachMedia] Total Images: ${report.total_images}`);
    console.log(`[AttachMedia] Average Images per Trade: ${report.images_per_trade_avg}`);
    console.log(`[AttachMedia] Orphaned Images: ${report.orphaned_images}`);
    console.log(`[AttachMedia] Updated Trades: ${report.updated_files}`);
    console.log(`[AttachMedia] Validation Errors: ${validationErrors.length}`);
    console.log('[AttachMedia] ================================');

    if (!dryRun && updatedFiles.length > 0) {
      console.log(`[AttachMedia] ✓ Updated ${updatedFiles.length} trade file(s)`);
    }

    return {
      status: 'success',
      dry_run: dryRun,
      report: report,
      validation_errors: validationErrors
    };
    
  } catch (error) {
    console.error('[AttachMedia] Error attaching media:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Attach media and emit event
 * @param {boolean} dryRun - If true, only validate without modifying
 */
export async function attachMediaAndEmit(dryRun = false) {
  const result = await attachMedia(dryRun);
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('media:attached', result);
  }
  
  return result;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesAttachMedia = {
    attachMedia,
    attachMediaAndEmit,
    scanTradeImages,
    validateImageReferences,
    updateTradeMetadata,
    findOrphanedImages
  };
}

console.log('[AttachMedia] Module loaded - FULL implementation');
