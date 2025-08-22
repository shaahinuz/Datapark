// Comparison and analysis engine for IT Park data
class ComparisonEngine {
    analyzeCompanyChanges(companies1 = [], companies2 = []) {
        const map1 = new Map(companies1.map(c => [c.name, { employees: c.employees, direction: c.direction }]));
        const map2 = new Map(companies2.map(c => [c.name, { employees: c.employees, direction: c.direction }]));
        const added = [], removed = [], changed = [];

        map1.forEach((data, name) => {
            if (!map2.has(name)) {
                added.push({ name, employees: data.employees, direction: data.direction });
            } else {
                const oldData = map2.get(name);
                const newEmp = data.employees || 0;
                const oldEmp = oldData.employees || 0;
                const change = newEmp - oldEmp;
                
                if (change !== 0 && (newEmp > 0 || oldEmp > 0)) {
                    changed.push({ 
                        name, 
                        employeesNew: newEmp, 
                        employeesOld: oldEmp, 
                        change: change, 
                        direction: data.direction 
                    });
                }
            }
        });
        
        map2.forEach((data, name) => {
            if (!map1.has(name)) {
                removed.push({ name, employees: data.employees, direction: data.direction });
            }
        });
        
        return { added, removed, changed };
    }

    createPeriodComparison(data1, data2, periodKey1, periodKey2) {
        const companyChanges = this.analyzeCompanyChanges(data1.companies, data2.companies);

        return {
            period1: { key: periodKey1, data: data1 },
            period2: { key: periodKey2, data: data2 },
            companyChanges: companyChanges
        };
    }

    createDistrictComparison(data1, data2, districtKey1, districtKey2) {
        const companyChanges = this.analyzeCompanyChanges(data1.companies, data2.companies);

        return {
            period1: { key: districtKey1, data: data1 },
            period2: { key: districtKey2, data: data2 },
            companyChanges: companyChanges
        };
    }

    calculateMetricChange(newValue, oldValue) {
        if (newValue == null || oldValue == null) return null;
        
        const change = newValue - oldValue;
        const percentage = oldValue ? ((change / oldValue) * 100) : 0;
        const isPositive = change >= 0;

        return {
            change,
            percentage,
            isPositive,
            newValue,
            oldValue
        };
    }

    getComparisonMetrics() {
        return [
            { name: 'Всего резидентов', key: 'totalResidents', format: 0 },
            { name: 'Кол-во сотрудников', key: 'employeeCount', format: 0 },
            { name: 'Совокупный доход', key: 'totalIncome', format: 3 },
            { name: 'Объем экспорта', key: 'exportVolume', format: 3 }
        ];
    }

    // Track company changes across multiple periods chronologically
    analyzeCompanyHistory(periodsData) {
        const sortedPeriods = Object.keys(periodsData).sort();
        const companyHistory = new Map();
        const companyTimeline = [];

        // Build company history map
        sortedPeriods.forEach((periodKey, periodIndex) => {
            const data = periodsData[periodKey];
            const companies = data.companies || [];
            const displayPeriod = periodKey.replace('period_', '');

            companies.forEach(company => {
                if (!companyHistory.has(company.name)) {
                    companyHistory.set(company.name, {
                        name: company.name,
                        firstSeen: displayPeriod,
                        lastSeen: displayPeriod,
                        periods: [],
                        direction: company.direction
                    });
                }

                const history = companyHistory.get(company.name);
                history.lastSeen = displayPeriod;
                history.periods.push({
                    period: displayPeriod,
                    employees: company.employees || 0,
                    direction: company.direction || history.direction
                });
            });

            // Track companies that disappeared in this period
            if (periodIndex > 0) {
                const previousPeriod = sortedPeriods[periodIndex - 1];
                const previousCompanies = new Set((periodsData[previousPeriod].companies || []).map(c => c.name));
                const currentCompanies = new Set(companies.map(c => c.name));

                previousCompanies.forEach(companyName => {
                    if (!currentCompanies.has(companyName) && companyHistory.has(companyName)) {
                        companyHistory.get(companyName).lastSeen = periodsData[previousPeriod] ? 
                            previousPeriod.replace('period_', '') : displayPeriod;
                    }
                });
            }
        });

        // Create timeline events
        companyHistory.forEach((history, companyName) => {
            // Company first appearance
            companyTimeline.push({
                type: 'added',
                period: history.firstSeen,
                company: companyName,
                direction: history.direction,
                employees: history.periods[0]?.employees || 0
            });

            // Employee changes
            for (let i = 1; i < history.periods.length; i++) {
                const prev = history.periods[i - 1];
                const curr = history.periods[i];
                const change = curr.employees - prev.employees;

                if (change !== 0) {
                    companyTimeline.push({
                        type: 'changed',
                        period: curr.period,
                        company: companyName,
                        direction: curr.direction,
                        employeesOld: prev.employees,
                        employeesNew: curr.employees,
                        change: change
                    });
                }
            }

            // Company disappearance (if last seen is not the latest period)
            const latestPeriod = sortedPeriods[sortedPeriods.length - 1].replace('period_', '');
            if (history.lastSeen !== latestPeriod) {
                companyTimeline.push({
                    type: 'removed',
                    period: history.lastSeen,
                    company: companyName,
                    direction: history.direction,
                    employees: history.periods[history.periods.length - 1]?.employees || 0
                });
            }
        });

        // Sort timeline by period, then by type priority (added -> changed -> removed)
        const typePriority = { added: 1, changed: 2, removed: 3 };
        companyTimeline.sort((a, b) => {
            if (a.period !== b.period) {
                return a.period.localeCompare(b.period);
            }
            return typePriority[a.type] - typePriority[b.type];
        });

        return {
            companyHistory: Array.from(companyHistory.values()),
            timeline: companyTimeline,
            periods: sortedPeriods.map(p => p.replace('period_', '')),
            totalCompanies: companyHistory.size
        };
    }

    // Get company statistics across all periods
    getCompanyStatistics(periodsData) {
        const history = this.analyzeCompanyHistory(periodsData);
        const stats = {
            totalUniqueCompanies: history.totalCompanies,
            newCompanies: history.timeline.filter(e => e.type === 'added').length,
            removedCompanies: history.timeline.filter(e => e.type === 'removed').length,
            changedCompanies: new Set(history.timeline.filter(e => e.type === 'changed').map(e => e.company)).size,
            totalEmployeeChanges: history.timeline.filter(e => e.type === 'changed').reduce((sum, e) => sum + Math.abs(e.change), 0),
            directionBreakdown: {}
        };

        // Direction statistics
        history.companyHistory.forEach(company => {
            const dir = company.direction || 'Не указано';
            stats.directionBreakdown[dir] = (stats.directionBreakdown[dir] || 0) + 1;
        });

        return stats;
    }

    // Get all companies from all periods for company selection
    getAllCompanies(periodsData) {
        const companiesSet = new Set();
        
        Object.values(periodsData).forEach(periodData => {
            if (periodData.companies) {
                periodData.companies.forEach(company => {
                    companiesSet.add(company.name);
                });
            }
        });
        
        return Array.from(companiesSet).sort();
    }

    // Get data for a specific company across all periods
    getCompanyData(periodsData, companyName) {
        console.log('getCompanyData called for company:', companyName);
        const sortedPeriods = Object.keys(periodsData).sort();
        console.log('Sorted periods:', sortedPeriods);
        const companyData = [];
        
        sortedPeriods.forEach(periodKey => {
            const data = periodsData[periodKey];
            const displayPeriod = periodKey.replace('period_', '');
            const company = data.companies?.find(c => c.name === companyName);
            
            console.log(`Period ${periodKey}: company found:`, !!company, company ? `employees: ${company.employees}` : 'not found');
            
            companyData.push({
                period: displayPeriod,
                periodKey: periodKey,
                employees: company ? (company.employees || 0) : null,
                direction: company ? company.direction : null,
                present: !!company
            });
        });
        
        const result = {
            companyName: companyName,
            periods: companyData,
            totalPeriods: companyData.filter(p => p.present).length,
            firstSeen: companyData.find(p => p.present)?.period,
            lastSeen: companyData.slice().reverse().find(p => p.present)?.period
        };
        
        console.log('getCompanyData result:', result);
        return result;
    }
}

// Make available globally
window.ComparisonEngine = ComparisonEngine;