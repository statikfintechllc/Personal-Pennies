/**
 * Base Importer Class (JavaScript version)
 * Base class for all broker CSV importers
 * 
 * This is a stub/placeholder for .github/scripts/importers/base_importer.py
 */

export class BaseImporter {
  constructor(brokerName) {
    this.brokerName = brokerName;
  }
  
  /**
   * Parse a CSV file from the broker
   * @param {string} csvContent - CSV file content
   * @returns {Promise<Array>} Array of parsed trades
   */
  async parseCsv(csvContent) {
    console.log(`[${this.brokerName}] Parsing CSV...`);
    throw new Error('parseCsv() must be implemented by subclass');
  }
  
  /**
   * Convert broker trade format to Personal-Pennies format
   * @param {Object} brokerTrade - Trade in broker format
   * @returns {Object} Trade in Personal-Pennies format
   */
  convertToStandardFormat(brokerTrade) {
    console.log(`[${this.brokerName}] Converting trade format...`);
    throw new Error('convertToStandardFormat() must be implemented by subclass');
  }
  
  /**
   * Import trades from CSV
   * @param {File} file - CSV file
   * @returns {Promise<Array>} Array of imported trades
   */
  async importTrades(file) {
    console.log(`[${this.brokerName}] Importing trades from ${file.name}...`);
    
    try {
      const csvContent = await file.text();
      const brokerTrades = await this.parseCsv(csvContent);
      const standardTrades = brokerTrades.map(t => this.convertToStandardFormat(t));
      
      console.log(`[${this.brokerName}] Imported ${standardTrades.length} trade(s)`);
      return standardTrades;
    } catch (error) {
      console.error(`[${this.brokerName}] Error importing trades:`, error);
      throw error;
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.PersonalPenniesBaseImporter = BaseImporter;
}

console.log('[BaseImporter] Module loaded');
