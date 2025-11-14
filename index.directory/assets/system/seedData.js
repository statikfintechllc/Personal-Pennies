/**
 * Seed Data Loader
 * Loads initial data from JSON files into IndexedDB on first run
 */

(async function initializeSeedData() {
    console.log('[SeedData] Checking if IndexedDB needs seeding...');

    // Wait for IndexedDB to be ready
    let retries = 0;
    while (!window.PersonalPenniesDB && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }

    if (!window.PersonalPenniesDB) {
        console.error('[SeedData] IndexedDB not available after 5 seconds');
        return;
    }

    console.log('[SeedData] IndexedDB available, checking for existing data...');

    try {
        // Check if we already have data
        const existingTrades = await window.PersonalPenniesDB.getAllTrades();
        const existingAnalytics = await window.PersonalPenniesDB.getAnalytics();

        if (existingTrades && existingTrades.length > 0) {
            console.log('[SeedData] IndexedDB already has data, skipping seed');
            return;
        }

        console.log('[SeedData] IndexedDB is empty, loading seed data from JSON files...');

        const basePath = window.location.pathname.includes('index.html') 
            ? window.location.pathname.replace('index.html', '') 
            : window.location.pathname;

        // Load trades-index.json
        try {
            const tradesResponse = await fetch(`${basePath}index.directory/trades-index.json`);
            if (tradesResponse.ok) {
                const tradesData = await tradesResponse.json();
                if (tradesData.trades && Array.isArray(tradesData.trades)) {
                    console.log(`[SeedData] Loading ${tradesData.trades.length} trades into IndexedDB...`);
                    for (const trade of tradesData.trades) {
                        await window.PersonalPenniesDB.saveTrade(trade);
                    }
                    console.log('[SeedData] ✓ Trades loaded successfully');
                }
            }
        } catch (error) {
            console.log('[SeedData] No trades file found or error loading:', error.message);
        }

        // Load account-config.json
        try {
            const configResponse = await fetch(`${basePath}index.directory/account-config.json`);
            if (configResponse.ok) {
                const configData = await configResponse.json();
                console.log('[SeedData] Loading account config into IndexedDB...');
                await window.PersonalPenniesDB.saveConfig('account-config', configData);
                console.log('[SeedData] ✓ Account config loaded successfully');
            }
        } catch (error) {
            console.log('[SeedData] No config file found or error loading:', error.message);
        }

        // Load analytics.json (if exists)
        try {
            const analyticsResponse = await fetch(`${basePath}index.directory/analytics.json`);
            if (analyticsResponse.ok) {
                const analyticsData = await analyticsResponse.json();
                console.log('[SeedData] Loading analytics into IndexedDB...');
                await window.PersonalPenniesDB.saveAnalytics(analyticsData);
                console.log('[SeedData] ✓ Analytics loaded successfully');
            }
        } catch (error) {
            console.log('[SeedData] No analytics file found or error loading:', error.message);
        }

        console.log('[SeedData] ✓ Seed data loading complete');

        // Emit event to notify components that data is ready
        if (window.SFTiEventBus) {
            window.SFTiEventBus.emit('seeddata:loaded');
        }

    } catch (error) {
        console.error('[SeedData] Error during seed data loading:', error);
    }
})();
