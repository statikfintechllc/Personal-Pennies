/**
 * Event Bus - Central event management system
 * Provides reactive updates across the entire application
 * 
 * Events:
 * - account:balance-updated - When starting balance changes
 * - account:deposit-added - When a deposit is added
 * - account:withdrawal-added - When a withdrawal is added
 * - account:config-loaded - When account config is loaded
 * - account:updated - When account state is updated (deposits, withdrawals, balance changes)
 * - state:initialized - When state manager completes initialization
 * - state:refreshed - When state manager refreshes all data
 * - trades:loaded - When trades are loaded
 * - trades:updated - When trades data changes
 * - analytics:updated - When analytics are recalculated
 * - stats:updated - When statistics are recalculated
 */

class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to an event (one-time)
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (...args) => {
      callback(...args);
      unsubscribe();
    });
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.listeners[event]) {
      return;
    }
    
    console.log(`[EventBus] Emitting: ${event}`, data);
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  off(event) {
    delete this.listeners[event];
  }

  /**
   * Remove all listeners
   */
  clear() {
    this.listeners = {};
  }

  /**
   * Get all active events
   */
  getEvents() {
    return Object.keys(this.listeners);
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(event) {
    return this.listeners[event]?.length || 0;
  }
}

// Create global event bus
window.SFTiEventBus = new EventBus();

// Log event bus initialization
console.log('[EventBus] Initialized global event bus');

// StateManager removed - all components now read/write directly to IndexedDB via PersonalPenniesDB
// This eliminates fallback complexity and ensures single source of truth
