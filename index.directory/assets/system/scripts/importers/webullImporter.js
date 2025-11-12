/**
 * Webull Importer (JavaScript version)
 * Import trades from Webull CSV exports
 * 
 * This is a stub/placeholder for .github/scripts/importers/webull.py
 */

import { BaseImporter } from './baseImporter.js';

export class WebullImporter extends BaseImporter {
  constructor() {
    super('Webull');
  }
  
  async parseCsv(csvContent) {
    console.log('[Webull] Note: Full CSV parsing to be implemented with PapaParse');
    return [];
  }
  
  convertToStandardFormat(brokerTrade) {
    return {
      ticker: brokerTrade.symbol,
      entry_date: brokerTrade.date,
      entry_price: brokerTrade.price
    };
  }
}

if (typeof window !== 'undefined') {
  window.PersonalPenniesWebullImporter = WebullImporter;
}

console.log('[WebullImporter] Module loaded (placeholder)');
