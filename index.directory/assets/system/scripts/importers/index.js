/**
 * Importers Index (JavaScript version)
 * Exports all broker importers for easy access
 * 
 * This is a direct JavaScript port of .github/scripts/importers/__init__.py
 */

export { BaseImporter } from './baseImporter.js';
export { WebullImporter } from './webullImporter.js';
export { IbkrImporter } from './ibkrImporter.js';
export { SchwabImporter } from './schwabImporter.js';
export { RobinhoodImporter } from './robinhoodImporter.js';

/**
 * Get importer for a specific broker
 * @param {string} brokerName - Broker name
 * @returns {BaseImporter} Importer instance
 */
export function getImporter(brokerName) {
  const name = brokerName.toLowerCase();
  
  switch (name) {
    case 'webull':
      return new WebullImporter();
    case 'ibkr':
    case 'interactive brokers':
      return new IbkrImporter();
    case 'schwab':
    case 'td ameritrade':
    case 'tda':
      return new SchwabImporter();
    case 'robinhood':
      return new RobinhoodImporter();
    default:
      throw new Error(`Unknown broker: ${brokerName}`);
  }
}

if (typeof window !== 'undefined') {
  window.PersonalPenniesImporters = {
    getImporter
  };
}

console.log('[Importers] All broker importers loaded');
