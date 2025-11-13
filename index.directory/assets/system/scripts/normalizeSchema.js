/**
 * Normalize Schema Script (JavaScript version)
 * Handles schema migrations and versioning for trade data
 * 
 * This is a COMPLETE JavaScript port of .github/scripts/normalize_schema.py (242 lines)
 * All schema migration and validation functions fully implemented
 * 
 * Features:
 * - Migrate old trade formats to new formats
 * - Validate trades against schema versions
 * - Supports schema versions 1.0 and 1.1
 * - Dry-run mode for safe testing
 */

const CURRENT_SCHEMA_VERSION = '1.1';

// Schema version history
const SCHEMA_VERSIONS = {
  '1.0': 'Initial schema with basic trade fields',
  '1.1': 'Added tags (strategy, setup, session, market_condition) and notes field'
};

/**
 * Get current schema version from index
 * @param {Object} indexData - Trade index data
 * @returns {string} Schema version
 */
function getSchemaVersion(indexData) {
  return indexData.version || '1.0';
}

/**
 * Migrate trade from schema 1.0 to 1.1
 * 
 * Changes in 1.1:
 * - Add tags field (list of strings)
 * - Add strategy_tags, setup_tags, session_tags, market_condition_tags fields
 * - Add notes field (string)
 * 
 * @param {Object} trade - Trade in 1.0 format
 * @returns {Object} Trade in 1.1 format
 */
function migrate_1_0_to_1_1(trade) {
  // Add new fields with defaults
  if (!trade.tags) {
    trade.tags = [];
  }

  if (!trade.strategy_tags) {
    // If old 'strategy' field exists, use it as a tag
    const strategy = trade.strategy || '';
    trade.strategy_tags = strategy ? [strategy] : [];
  }

  if (!trade.setup_tags) {
    trade.setup_tags = [];
  }

  if (!trade.session_tags) {
    trade.session_tags = [];
  }

  if (!trade.market_condition_tags) {
    trade.market_condition_tags = [];
  }

  if (!trade.notes) {
    trade.notes = trade.notes || '';
  }

  // Keep backward compatibility - maintain old 'strategy' field
  // This allows old code to still work

  return trade;
}

/**
 * Migrate index data to target schema version
 * 
 * @param {Object} indexData - Trade index data
 * @param {string} targetVersion - Target schema version
 * @returns {Object} Migrated index data
 */
function migrateSchema(indexData, targetVersion = CURRENT_SCHEMA_VERSION) {
  const currentVersion = getSchemaVersion(indexData);

  if (currentVersion === targetVersion) {
    console.log(`[NormalizeSchema] Schema is already at version ${targetVersion}`);
    return indexData;
  }

  console.log(`[NormalizeSchema] Migrating schema from ${currentVersion} to ${targetVersion}`);

  const trades = indexData.trades || [];
  const migratedTrades = [];

  for (let trade of trades) {
    // Apply migrations in sequence
    if (currentVersion === '1.0' && targetVersion === '1.1') {
      trade = migrate_1_0_to_1_1(trade);
    }

    // Future migration paths can be added here as schema evolves
    // Example:
    // else if (currentVersion === '1.1' && targetVersion === '1.2') {
    //   trade = migrate_1_1_to_1_2(trade);
    // }

    migratedTrades.push(trade);
  }

  // Update version
  indexData.trades = migratedTrades;
  indexData.version = targetVersion;
  indexData.schema_migrated_at = new Date().toISOString();

  return indexData;
}

/**
 * Validate that a trade conforms to the specified schema version
 * 
 * @param {Object} trade - Trade dictionary
 * @param {string} version - Schema version to validate against
 * @returns {Object} {isValid: boolean, errors: Array<string>}
 */
function validateSchema(trade, version = CURRENT_SCHEMA_VERSION) {
  const errors = [];

  // Required fields for all versions
  const requiredBaseFields = [
    'trade_number',
    'ticker',
    'entry_date',
    'entry_price',
    'exit_price',
    'position_size',
    'direction'
  ];

  for (const field of requiredBaseFields) {
    if (!(field in trade)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Version-specific validation
  if (version === '1.1') {
    // Check for 1.1-specific fields
    const v11Fields = ['strategy_tags', 'setup_tags', 'session_tags', 'market_condition_tags', 'notes'];
    
    for (const field of v11Fields) {
      if (!(field in trade)) {
        errors.push(`Missing 1.1 field: ${field}`);
      }
    }

    // Validate that tag fields are arrays
    const tagFields = ['strategy_tags', 'setup_tags', 'session_tags', 'market_condition_tags'];
    for (const field of tagFields) {
      if (trade[field] && !Array.isArray(trade[field])) {
        errors.push(`${field} must be an array`);
      }
    }

    // Validate that notes is a string
    if (trade.notes && typeof trade.notes !== 'string') {
      errors.push('notes must be a string');
    }
  }

  // Type validation for common fields
  if (trade.trade_number && typeof trade.trade_number !== 'number') {
    errors.push('trade_number must be a number');
  }

  if (trade.entry_price && typeof trade.entry_price !== 'number') {
    errors.push('entry_price must be a number');
  }

  if (trade.exit_price && typeof trade.exit_price !== 'number') {
    errors.push('exit_price must be a number');
  }

  if (trade.position_size && typeof trade.position_size !== 'number') {
    errors.push('position_size must be a number');
  }

  // Validate direction
  if (trade.direction && !['LONG', 'SHORT'].includes(trade.direction)) {
    errors.push('direction must be LONG or SHORT');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Normalize schema for all trades in IndexedDB
 * @param {boolean} dryRun - If true, only validate without modifying
 * @returns {Promise<Object>} Result of normalization
 */
export async function normalizeSchema(dryRun = false) {
  console.log('[NormalizeSchema] Normalizing trade schemas...');
  console.log(`[NormalizeSchema] Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify data)'}`);
  
  if (!window.PersonalPenniesDB) {
    console.error('[NormalizeSchema] DB not initialized');
    return { status: 'error', message: 'DB not initialized' };
  }
  
  try {
    // Load trades index
    const tradesIndex = await window.PersonalPenniesDB.getIndex('trades-index');
    
    if (!tradesIndex) {
      console.warn('[NormalizeSchema] No trades index found');
      return { status: 'skipped', message: 'No trades index' };
    }

    const currentVersion = getSchemaVersion(tradesIndex);
    console.log(`[NormalizeSchema] Current schema version: ${currentVersion}`);
    console.log(`[NormalizeSchema] Target schema version: ${CURRENT_SCHEMA_VERSION}`);

    // Migrate schema if needed
    let migratedIndex = tradesIndex;
    if (currentVersion !== CURRENT_SCHEMA_VERSION) {
      migratedIndex = migrateSchema(tradesIndex, CURRENT_SCHEMA_VERSION);
      console.log(`[NormalizeSchema] Schema migrated from ${currentVersion} to ${CURRENT_SCHEMA_VERSION}`);
    }

    // Validate all trades
    const trades = migratedIndex.trades || [];
    const validationResults = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const trade of trades) {
      const result = validateSchema(trade, CURRENT_SCHEMA_VERSION);
      validationResults.push({
        trade_number: trade.trade_number,
        ticker: trade.ticker,
        isValid: result.isValid,
        errors: result.errors
      });

      if (result.isValid) {
        validCount += 1;
      } else {
        invalidCount += 1;
        console.warn(`[NormalizeSchema] Trade #${trade.trade_number} validation failed:`, result.errors);
      }
    }

    // Save migrated data if not dry run
    if (!dryRun && currentVersion !== CURRENT_SCHEMA_VERSION) {
      await window.PersonalPenniesDB.saveIndex('trades-index', migratedIndex);
      console.log('[NormalizeSchema] ✓ Migrated schema saved to IndexedDB');
    }

    console.log(`[NormalizeSchema] Validation complete: ${validCount} valid, ${invalidCount} invalid`);
    
    return {
      status: 'success',
      dry_run: dryRun,
      current_version: currentVersion,
      target_version: CURRENT_SCHEMA_VERSION,
      migrated: currentVersion !== CURRENT_SCHEMA_VERSION,
      total_trades: trades.length,
      valid_count: validCount,
      invalid_count: invalidCount,
      validation_results: validationResults
    };
    
  } catch (error) {
    console.error('[NormalizeSchema] Error normalizing schemas:', error);
    return { status: 'error', message: error.message };
  }
}

/**
 * Normalize schema and emit event
 * @param {boolean} dryRun - If true, only validate without modifying
 */
export async function normalizeSchemaAndEmit(dryRun = false) {
  const result = await normalizeSchema(dryRun);
  
  // Emit event
  if (window.SFTiEventBus) {
    window.SFTiEventBus.emit('schema:normalized', result);
  }
  
  return result;
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesNormalizeSchema = {
    normalizeSchema,
    normalizeSchemaAndEmit,
    validateSchema,
    migrateSchema,
    CURRENT_SCHEMA_VERSION,
    SCHEMA_VERSIONS
  };
}

console.log('[NormalizeSchema] Module loaded - FULL implementation');
