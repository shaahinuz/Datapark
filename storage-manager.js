// Storage management for IT Park extension
class StorageManager {
    constructor() {
        this.browserAPI = typeof chrome !== 'undefined' ? chrome : browser;
    }

    async saveData(pageData, districtName = '') {
        if (!pageData || !pageData.periodKey || pageData.periodKey.includes('YYYY') || pageData.periodKey.includes('Q_')) {
            throw new Error("Не удалось определить период на странице.");
        }
        
        let key, displayName;
        if (districtName) {
            key = `district_${districtName}_${pageData.periodKey}`;
            displayName = `${districtName}_${pageData.periodKey}`;
        } else {
            key = `period_${pageData.periodKey}`;
            displayName = pageData.periodKey;
        }
        
        await this.browserAPI.storage.local.set({ [key]: pageData.data });
        return displayName;
    }

    async getAllData() {
        return await this.browserAPI.storage.local.get(null);
    }

    async getData(keys) {
        return await this.browserAPI.storage.local.get(keys);
    }

    async clearAllData() {
        const allData = await this.getAllData();
        const keysToRemove = Object.keys(allData);
        
        if (keysToRemove.length === 0) {
            return 0;
        }
        
        await this.browserAPI.storage.local.remove(keysToRemove);
        return keysToRemove.length;
    }

    async getSavedPeriods() {
        const allData = await this.getAllData();
        return Object.keys(allData).filter(key => key.startsWith('period_'));
    }

    async getSavedDistricts() {
        const allData = await this.getAllData();
        return Object.keys(allData).filter(key => key.startsWith('district_'));
    }

    async getUniqueDistricts() {
        const districtKeys = await this.getSavedDistricts();
        const uniqueDistricts = new Set();
        
        districtKeys.forEach(key => {
            const parts = key.replace('district_', '').split('_');
            if (parts.length >= 2) {
                uniqueDistricts.add(parts[0]);
            }
        });
        
        return Array.from(uniqueDistricts);
    }

    async getDistrictDataForPeriod(districtName, period) {
        const allData = await this.getAllData();
        const districtKeys = Object.keys(allData).filter(key => 
            key.startsWith('district_') && 
            key.replace('district_', '').split('_')[0] === districtName
        );
        
        if (period) {
            return districtKeys.filter(key => key.includes(period));
        }
        
        return districtKeys;
    }
}

// Make available globally
window.StorageManager = StorageManager;