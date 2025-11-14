/**
 * Seed Data Loader for IndexedDB
 * Loads initial data from JSON files into IndexedDB if database is empty
 */

export async function seedIndexedDB() {
    console.log('[SeedData] Checking if IndexedDB needs seeding...');

    if (!window.PersonalPenniesDB) {
        console.error('[SeedData] IndexedDB system not available');
        return false;
    }

    try {
        // Check if trades exist in IndexedDB
        const existingTrades = await window.PersonalPenniesDB.getAllTrades();
        
        if (existingTrades && existingTrades.length > 0) {
            console.log('[SeedData] IndexedDB already has data, skipping seed');
            return true;
        }

        console.log('[SeedData] IndexedDB is empty, loading seed data from files...');

        // Get base path
        const basePath = window.location.pathname.includes('index.html') 
            ? window.location.pathname.replace('index.html', '')
            : window.location.pathname;

        // Load trades-index.json
        const tradesResponse = await fetch(`${basePath}index.directory/trades-index.json`);
        if (tradesResponse.ok) {
            const tradesData = await tradesResponse.json();
            console.log(`[SeedData] Loaded ${tradesData.trades?.length || 0} trades from file`);
            
            // Save each trade to IndexedDB
            if (tradesData.trades && Array.isArray(tradesData.trades)) {
                for (const trade of tradesData.trades) {
                    await window.PersonalPenniesDB.saveTrade(trade);
                }
                console.log('[SeedData] ✓ Trades seeded to IndexedDB');
            }
        } else {
            console.warn('[SeedData] trades-index.json not found');
        }

        // Load account-config.json
        const configResponse = await fetch(`${basePath}index.directory/account-config.json`);
        if (configResponse.ok) {
            const configData = await configResponse.json();
            console.log('[SeedData] Loaded account config from file');
            
            // Save config to IndexedDB
            await window.PersonalPenniesDB.saveConfig('account-config', configData);
            console.log('[SeedData] ✓ Account config seeded to IndexedDB');
        } else {
            console.warn('[SeedData] account-config.json not found');
        }

        // Load analytics.json
        const analyticsResponse = await fetch(`${basePath}index.directory/analytics.json`);
        if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            console.log('[SeedData] Loaded analytics from file');
            
            // Save analytics to IndexedDB
            await window.PersonalPenniesDB.saveAnalytics(analyticsData);
            console.log('[SeedData] ✓ Analytics seeded to IndexedDB');
        } else {
            console.warn('[SeedData] analytics.json not found');
        }

        console.log('[SeedData] ✓ Seed data loading complete');
        return true;

    } catch (error) {
        console.error('[SeedData] Error seeding IndexedDB:', error);
        return false;
    }
}

// Auto-seed when module loads if PersonalPenniesDB is available
if (typeof window !== 'undefined' && window.PersonalPenniesDB) {
    seedIndexedDB();
}
