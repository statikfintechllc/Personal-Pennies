/**
 * IBKR Importer (JavaScript version)
 * Import trades from Interactive Brokers CSV exports
 * 
 * This is a stub/placeholder for .github/scripts/importers/ibkr.py
 */

import { BaseImporter } from './baseImporter.js';

export class IbkrImporter extends BaseImporter {
  constructor() {
    super('IBKR');
  }
  
  async parseCsv(csvContent) {
    console.log('[IBKR] Note: Full CSV parsing to be implemented with PapaParse');
    return [];
  }
  
  convertToStandardFormat(brokerTrade) {
    return {
      ticker: brokerTrade.symbol,
      entry_date: brokerTrade.tradeDate,
      entry_price: brokerTrade.tradePrice
    };
  }
}

if (typeof window !== 'undefined') {
  window.PersonalPenniesIbkrImporter = IbkrImporter;
}

console.log('[IbkrImporter] Module loaded (placeholder)');
