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

    async saveStartups(periodKey, startupCompanies) {
        const startupKey = `startups_${periodKey.replace('period_', '')}`;
        await this.browserAPI.storage.local.set({ [startupKey]: startupCompanies });
        return startupKey;
    }

    async getStartups(periodKey) {
        const startupKey = `startups_${periodKey.replace('period_', '')}`;
        const data = await this.browserAPI.storage.local.get(startupKey);
        const startups = data[startupKey] || [];
        
        console.log('🔍 DEBUG getStartups:', {
            periodKey,
            startupKey,
            startupsFound: startups.length,
            startupData: startups.map(s => ({
                name: s.name,
                employeeCount: s.employeeCount,
                employees: s.employees
            }))
        });
        
        return startups;
    }

    async getAllStartups() {
        const allData = await this.getAllData();
        return Object.keys(allData).filter(key => key.startsWith('startups_'));
    }

    async getAllStartupCompanies() {
        const allData = await this.getAllData();
        const startupKeys = Object.keys(allData).filter(key => key.startsWith('startups_'));
        
        const allStartupCompanies = [];
        startupKeys.forEach(key => {
            const startups = allData[key] || [];
            startups.forEach(startup => {
                // Add period information to each startup
                const periodName = key.replace('startups_', '');
                allStartupCompanies.push({
                    ...startup,
                    sourcePeriod: periodName
                });
            });
        });
        
        return allStartupCompanies;
    }

    async getStartupCompaniesForPeriod(periodKey, availableCompanies) {
        console.log('🔍 DEBUG getStartupCompaniesForPeriod called:', {
            periodKey,
            availableCompaniesCount: availableCompanies.length
        });
        
        // Get startups specifically saved for this period
        const periodStartups = await this.getStartups(periodKey);
        
        // Get all startup companies from all periods
        const allStartupCompanies = await this.getAllStartupCompanies();
        
        console.log('🔍 DEBUG startup data:', {
            periodStartupsCount: periodStartups.length,
            allStartupCompaniesCount: allStartupCompanies.length,
            allStartupCompanies: allStartupCompanies.map(s => ({
                name: s.name,
                sourcePeriod: s.sourcePeriod,
                employeeCount: s.employeeCount,
                employees: s.employees
            }))
        });
        
        // Create a map of company name+region to startup data
        const startupMap = new Map();
        
        // Add period-specific startups first (highest priority)
        periodStartups.forEach(startup => {
            const key = `${startup.name}||${startup.region || ''}`;
            console.log('🔍 DEBUG adding period startup:', {
                name: startup.name,
                employeeCount: startup.employeeCount,
                employees: startup.employees
            });
            startupMap.set(key, startup);
        });
        
        // Add startups from other periods if company exists in current period
        allStartupCompanies.forEach(startup => {
            const key = `${startup.name}||${startup.region || ''}`;
            
            // Only add if not already in the map and if company exists in current period
            if (!startupMap.has(key)) {
                // Try exact match first
                let companyExists = availableCompanies.some(company => 
                    company.name === startup.name && 
                    (company.region || '') === (startup.region || '')
                );
                
                let matchingCompany = null;
                
                if (companyExists) {
                    matchingCompany = availableCompanies.find(company => 
                        company.name === startup.name && 
                        (company.region || '') === (startup.region || '')
                    );
                } else {
                    // Try fuzzy matching
                    const cleanStartupName = startup.name.replace(/["""]/g, '"').trim().toUpperCase();
                    matchingCompany = availableCompanies.find(company => {
                        const cleanCompanyName = company.name.replace(/["""]/g, '"').trim().toUpperCase();
                        return cleanCompanyName === cleanStartupName && (company.region || '') === (startup.region || '');
                    });
                    companyExists = !!matchingCompany;
                }
                
                console.log(`🔍 DEBUG inheritance check for ${startup.name}:`, {
                    alreadyInMap: false,
                    companyExists,
                    startupRegion: startup.region || 'EMPTY',
                    availableCompanyNames: availableCompanies.map(c => c.name),
                    matchingCompanyFound: !!matchingCompany
                });
                
                if (companyExists && matchingCompany) {
                    
                    console.log(`✅ INHERITING startup ${startup.name} from ${startup.sourcePeriod}`);
                    
                    startupMap.set(key, {
                        ...startup,
                        inheritedFrom: startup.sourcePeriod,
                        // ALWAYS use current period employee data when available
                        employeeCount: matchingCompany?.employees || 0,
                        employees: matchingCompany?.employees || 0
                    });
                } else {
                    console.log(`❌ NOT inheriting ${startup.name} - company not found in current period`);
                }
            } else {
                console.log(`⚠️ Startup ${startup.name} already in map (from current period)`);
            }
        });
        
        return Array.from(startupMap.values());
    }

    async removeStartupFromAllPeriods(companyName, companyRegion = '') {
        console.log('🗑️ Removing startup from all periods:', companyName);
        const allData = await this.getAllData();
        const startupKeys = Object.keys(allData).filter(key => key.startsWith('startups_'));
        
        let removedCount = 0;
        
        for (const key of startupKeys) {
            const startups = allData[key] || [];
            const originalLength = startups.length;
            
            // Remove the company from this period's startups
            const filteredStartups = startups.filter(startup => 
                !(startup.name === companyName && (startup.region || '') === (companyRegion || ''))
            );
            
            if (filteredStartups.length !== originalLength) {
                // Update the storage
                await this.browserAPI.storage.local.set({ [key]: filteredStartups });
                removedCount++;
                console.log(`🗑️ Removed ${companyName} from ${key}`);
            }
        }
        
        return removedCount;
    }
}

// Make available globally
window.StorageManager = StorageManager;