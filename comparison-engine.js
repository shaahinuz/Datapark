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
}

// Make available globally
window.ComparisonEngine = ComparisonEngine;