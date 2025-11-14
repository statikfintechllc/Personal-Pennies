/**
 * seedDataLoader.js
 * Loads seed data from JSON files into IndexedDB on first run or when IndexedDB is empty
 */

(async function initializeSeedData() {
    'use strict';

    console.log('[SeedDataLoader] Checking if IndexedDB needs seeding...');

    // Wait for IndexedDB system to be ready
    let attempts = 0;
    while (!window.PersonalPenniesDB && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.PersonalPenniesDB) {
        console.error('[SeedDataLoader] ❌ IndexedDB system not available');
        return;
    }

    try {
        // Check if we need to seed data
        const trades = await window.PersonalPenniesDB.getAllTrades();
        const analytics = await window.PersonalPenniesDB.getAnalytics();
        const config = await window.PersonalPenniesDB.getConfig('account-config');

        const needsSeeding = !trades || trades.length === 0 || !analytics || !config;

        if (!needsSeeding) {
            console.log('[SeedDataLoader] ✓ IndexedDB already has data, skipping seed');
            return;
        }

        console.log('[SeedDataLoader] IndexedDB is empty, loading seed data from JSON files...');

        // Get base path
        const basePath = window.location.pathname.includes('index.html')
            ? window.location.pathname.replace('/index.html', '')
            : window.location.pathname.replace(/\/$/, '');

        // Load trades-index.json
        if (!trades || trades.length === 0) {
            try {
                const tradesResponse = await fetch(`${basePath}/index.directory/trades-index.json`);
                const tradesData = await tradesResponse.json();
                
                if (tradesData && tradesData.trades && Array.isArray(tradesData.trades)) {
                    console.log(`[SeedDataLoader] Loading ${tradesData.trades.length} trades into IndexedDB...`);
                    for (const trade of tradesData.trades) {
                        await window.PersonalPenniesDB.saveTrade(trade);
                    }
                    console.log(`[SeedDataLoader] ✓ Loaded ${tradesData.trades.length} trades`);
                }
            } catch (error) {
                console.warn('[SeedDataLoader] Could not load trades-index.json:', error);
            }
        }

        // Load analytics.json
        if (!analytics) {
            try {
                const analyticsResponse = await fetch(`${basePath}/index.directory/analytics.json`);
                const analyticsData = await analyticsResponse.json();
                
                if (analyticsData) {
                    console.log('[SeedDataLoader] Loading analytics into IndexedDB...');
                    await window.PersonalPenniesDB.saveAnalytics(analyticsData);
                    console.log('[SeedDataLoader] ✓ Loaded analytics');
                }
            } catch (error) {
                console.warn('[SeedDataLoader] Could not load analytics.json:', error);
            }
        }

        // Load account-config.json
        if (!config) {
            try {
                const configResponse = await fetch(`${basePath}/index.directory/account-config.json`);
                const configData = await configResponse.json();
                
                if (configData) {
                    console.log('[SeedDataLoader] Loading account config into IndexedDB...');
                    await window.PersonalPenniesDB.saveConfig('account-config', configData);
                    console.log('[SeedDataLoader] ✓ Loaded account config');
                }
            } catch (error) {
                console.warn('[SeedDataLoader] Could not load account-config.json:', error);
            }
        }

        console.log('[SeedDataLoader] ✓ Seed data loading complete!');
        
        // Emit event to notify that seed data is loaded
        if (window.SFTiEventBus) {
            window.SFTiEventBus.emit('seed:loaded', { timestamp: Date.now() });
        }

    } catch (error) {
        console.error('[SeedDataLoader] ❌ Error during seed data loading:', error);
    }
})();
