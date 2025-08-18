// UI management and display functionality
class UIManager {
    constructor() {
        this.storageManager = new StorageManager();
        this.comparisonEngine = new ComparisonEngine();
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        statusDiv.style.display = 'block';

        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    async loadSavedPeriodsIntoDropdowns() {
        const periodKeys = await this.storageManager.getSavedPeriods();
        
        const select1 = document.getElementById('period1-select');
        const select2 = document.getElementById('period2-select');
        select1.innerHTML = '';
        select2.innerHTML = '';

        if (periodKeys.length === 0) {
            select1.innerHTML = '<option value="">Нет сохраненных данных</option>';
            select2.innerHTML = '<option value="">Нет сохраненных данных</option>';
            return;
        }

        periodKeys.sort().reverse().forEach(key => {
            const optionText = key.replace('period_', '');
            select1.add(new Option(optionText, key));
            select2.add(new Option(optionText, key));
        });

        if (periodKeys.length > 1) {
            select1.selectedIndex = 0;
            select2.selectedIndex = 1;
        }
    }

    async loadSavedDistrictsIntoDropdowns() {
        const uniqueDistricts = await this.storageManager.getUniqueDistricts();
        
        const filterSelect = document.getElementById('district-filter-select');
        filterSelect.innerHTML = '<option value="">Выберите район для фильтрации...</option>';
        
        uniqueDistricts.sort().forEach(district => {
            filterSelect.add(new Option(district, district));
        });
        
        const select1 = document.getElementById('district1-select');
        const select2 = document.getElementById('district2-select');
        select1.innerHTML = '<option value="">Сначала выберите район выше</option>';
        select2.innerHTML = '<option value="">Сначала выберите район выше</option>';
        select1.disabled = true;
        select2.disabled = true;
    }

    async loadFilteredDistrictsIntoDropdowns(selectedDistrict) {
        const allData = await this.storageManager.getAllData();
        const districtKeys = Object.keys(allData).filter(key => key.startsWith('district_'));
        
        const select1 = document.getElementById('district1-select');
        const select2 = document.getElementById('district2-select');
        
        if (!selectedDistrict) {
            select1.innerHTML = '<option value="">Сначала выберите район выше</option>';
            select2.innerHTML = '<option value="">Сначала выберите район выше</option>';
            select1.disabled = true;
            select2.disabled = true;
            return;
        }
        
        const filteredKeys = districtKeys.filter(key => {
            const parts = key.replace('district_', '').split('_');
            return parts[0] === selectedDistrict;
        });
        
        select1.innerHTML = '';
        select2.innerHTML = '';
        select1.disabled = false;
        select2.disabled = false;

        if (filteredKeys.length === 0) {
            select1.innerHTML = `<option value="">Нет данных для ${selectedDistrict}</option>`;
            select2.innerHTML = `<option value="">Нет данных для ${selectedDistrict}</option>`;
            select1.disabled = true;
            select2.disabled = true;
            return;
        }

        filteredKeys.sort().reverse().forEach(key => {
            const optionText = key.replace('district_', '');
            select1.add(new Option(optionText, key));
            select2.add(new Option(optionText, key));
        });

        if (filteredKeys.length > 1) {
            select1.selectedIndex = 0;
            select2.selectedIndex = 1;
        }
    }

    displayCurrentData(pageData) {
        const section = document.getElementById('current-data-section');
        const { data, periodKey } = pageData;
        
        let html = `<h3>Данные на экране</h3>`;
        html += `<div class="current-data-header">${periodKey}</div>`;
        html += `<div class="kpi-grid">
            <div class="kpi-item"><div class="label">Компаний</div><div class="value">${data.totalResidents || '-'}</div></div>
            <div class="kpi-item"><div class="label">Сотрудников</div><div class="value">${data.employeeCount || '-'}</div></div>
            <div class="kpi-item"><div class="label">Доход (млрд)</div><div class="value">${data.totalIncome ? data.totalIncome.toFixed(3) : '-'}</div></div>
            <div class="kpi-item"><div class="label">Экспорт (млн)</div><div class="value">${data.exportVolume ? data.exportVolume.toFixed(3) : '-'}</div></div>
        </div>`;
        
        if (data.directions && data.directions.length > 0) {
            html += `<h4>Направления деятельности:</h4><div class="directions-list">`;
            data.directions.sort((a,b) => b.count - a.count).forEach(dir => {
                html += `<div class="direction-item"><span>${dir.name}</span><strong>${dir.count}</strong></div>`;
            });
            html += `</div>`;
        }

        section.innerHTML = html;
        section.style.display = 'block';
    }

    displayComparison(result) {
        const { period1, period2, companyChanges } = result;
        const comparisonGrid = document.getElementById('comparison-data');
        const companySection = document.getElementById('company-comparison-section');
        comparisonGrid.innerHTML = '';
        companySection.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'comparison-item';
        header.innerHTML = `
            <div class="metric" style="font-weight: bold;">Показатель</div>
            <div class="current" style="font-weight: bold;">${period1.key}</div>
            <div class="previous" style="font-weight: bold;">${period2.key}</div>
            <div class="change" style="font-weight: bold;">Изм.</div>
            <div class="percentage" style="font-weight: bold;">%</div>
        `;
        comparisonGrid.appendChild(header);

        const metrics = this.comparisonEngine.getComparisonMetrics();
        metrics.push({ name: 'Новые резиденты', key: 'newResidents', format: 0 });
        metrics.push({ name: 'Ушедшие резиденты', key: 'leftResidents', format: 0 });

        metrics.forEach(metric => {
            let val1, val2, change, percentage, isPositive, val1Display, val2Display, changeDisplay, percentageDisplay;
            
            if (metric.key === 'newResidents') {
                val1 = companyChanges.added.length;
                val1Display = val1;
                val2Display = '-';
                changeDisplay = `<span class="positive">+${val1}</span>`;
                percentageDisplay = `<span class="positive">-</span>`;
            } else if (metric.key === 'leftResidents') {
                val2 = companyChanges.removed.length;
                val1Display = '-';
                val2Display = val2;
                changeDisplay = `<span class="negative">-${val2}</span>`;
                percentageDisplay = `<span class="negative">-</span>`;
            } else {
                val1 = period1.data[metric.key];
                val2 = period2.data[metric.key];
                if (val1 == null || val2 == null) return;
                
                change = val1 - val2;
                percentage = val2 ? ((change / val2) * 100) : 0;
                isPositive = change >= 0;

                val1Display = val1.toFixed(metric.format);
                val2Display = val2.toFixed(metric.format);
                changeDisplay = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${change.toFixed(metric.format)}</span>`;
                percentageDisplay = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${percentage.toFixed(1)}%</span>`;
            }

            const row = document.createElement('div');
            row.className = 'comparison-item';
            row.innerHTML = `
                <div class="metric">${metric.name}</div>
                <div class="current">${val1Display}</div>
                <div class="previous">${val2Display}</div>
                <div class="change">${changeDisplay}</div>
                <div class="percentage">${percentageDisplay}</div>
            `;
            comparisonGrid.appendChild(row);
        });

        let companyHtml = '<h3>Детализация по компаниям</h3>';
        companyHtml += '<div class="table-container"><table class="company-table"><thead><tr><th>№</th><th>Компания</th><th>Направление</th><th>Статус</th><th>Сотрудники</th></tr></thead><tbody>';
        
        let counter = 1;
        companyChanges.added.forEach(c => {
            const employeeDisplay = c.employees > 0 ? `+${c.employees}` : '0';
            const employeeClass = c.employees > 0 ? 'positive' : '';
            companyHtml += `<tr><td>${counter++}</td><td>${c.name}</td><td>${c.direction || ''}</td><td><span class="positive">Новая</span></td><td class="change-col"><span class="${employeeClass}">${employeeDisplay}</span></td></tr>`;
        });
        
        companyChanges.changed.sort((a, b) => b.change - a.change).forEach(c => {
            if (c.change !== 0) {
                const sign = c.change > 0 ? '+' : '';
                const className = c.change > 0 ? 'positive' : 'negative';
                companyHtml += `<tr>
                    <td>${counter++}</td>
                    <td>${c.name}</td>
                    <td>${c.direction || ''}</td>
                    <td class="change-col"><span class="${className}">Изменение</span></td>
                    <td class="change-col"><span class="${className}">${sign}${c.change}</span></td>
                </tr>`;
            }
        });

        companyChanges.removed.forEach(c => {
            companyHtml += `<tr><td>${counter++}</td><td>${c.name}</td><td>${c.direction || ''}</td><td><span class="negative">Лишён статуса</span></td><td class="change-col"><span class="negative">-${c.employees}</span></td></tr>`;
        });

        companyHtml += '</tbody></table></div>';
        companySection.innerHTML = companyHtml;
        
        this.closeOtherComparisonSections('comparison-section');
        const section = document.getElementById('comparison-section');
        section.style.display = 'block';
        section.classList.add('showing');
        section.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            section.classList.remove('showing');
        }, 400);
    }

    displayDistrictComparison(result) {
        const section = document.getElementById('district-comparison-section');
        const dataDiv = document.getElementById('district-comparison-data');
        const companySection = document.getElementById('district-company-comparison-section');
        
        const { period1, period2, companyChanges } = result;
        const data1 = period1.data;
        const data2 = period2.data;

        let html = `<div class="comparison-item">
            <div class="metric">Метрика</div>
            <div class="current">${period1.key}</div>
            <div class="previous">${period2.key}</div>
            <div class="change">Изменение</div>
            <div class="percentage">%</div>
        </div>`;
        
        const metrics = [
            { name: 'Резиденты', current: data1.totalResidents, previous: data2.totalResidents },
            { name: 'Сотрудники', current: data1.employeeCount, previous: data2.employeeCount },
            { name: 'Доход (млрд сўм)', current: data1.totalIncome, previous: data2.totalIncome },
            { name: 'Экспорт (млн $)', current: data1.exportVolume, previous: data2.exportVolume }
        ];

        metrics.forEach(metric => {
            const current = metric.current || 0;
            const previous = metric.previous || 0;
            const change = current - previous;
            const percentage = previous !== 0 ? ((change / previous) * 100).toFixed(1) : '∞';
            const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : '';

            let currentDisplay, previousDisplay, changeDisplay;
            if (metric.name.includes('Доход') || metric.name.includes('Экспорт')) {
                currentDisplay = current.toFixed(3);
                previousDisplay = previous.toFixed(3);
                changeDisplay = change.toFixed(3);
            } else {
                currentDisplay = current;
                previousDisplay = previous;
                changeDisplay = change;
            }

            html += `<div class="comparison-item">
                <div class="metric">${metric.name}</div>
                <div class="current">${currentDisplay}</div>
                <div class="previous">${previousDisplay}</div>
                <div class="change ${changeClass}">${change > 0 ? '+' : ''}${changeDisplay}</div>
                <div class="percentage ${changeClass}">${change > 0 ? '+' : ''}${percentage}%</div>
            </div>`;
        });

        dataDiv.innerHTML = html;

        let companyHtml = '<h3>Изменения по компаниям</h3>';
        companyHtml += '<div class="table-container"><table class="company-table"><thead><tr><th>#</th><th>Компания</th><th>Направление</th><th>Статус</th><th>Сотрудники</th></tr></thead><tbody>';
        
        let counter = 1;
        companyChanges.added.forEach(c => {
            companyHtml += `<tr><td>${counter++}</td><td>${c.name}</td><td>${c.direction || ''}</td><td><span class="positive">Новая</span></td><td class="change-col"><span class="positive">+${c.employees}</span></td></tr>`;
        });

        companyChanges.changed.forEach(c => {
            const empChange = c.change || 0;
            if (empChange !== 0) {
                companyHtml += `<tr><td>${counter++}</td><td>${c.name}</td><td>${c.direction || ''}</td><td>Изменение</td><td class="change-col"><span class="${empChange > 0 ? 'positive' : 'negative'}">${empChange > 0 ? '+' : ''}${empChange}</span></td></tr>`;
            }
        });

        companyChanges.removed.forEach(c => {
            companyHtml += `<tr><td>${counter++}</td><td>${c.name}</td><td>${c.direction || ''}</td><td><span class="negative">Лишён статуса</span></td><td class="change-col"><span class="negative">-${c.employees}</span></td></tr>`;
        });

        companyHtml += '</tbody></table></div>';
        companySection.innerHTML = companyHtml;
        
        this.closeOtherComparisonSections('district-comparison-section');
        section.style.display = 'block';
        section.classList.add('showing');
        section.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            section.classList.remove('showing');
        }, 400);
    }

    displayDiagnosisReport(report) {
        let diagText = `📊 ДИАГНОСТИКА СТРАНИЦЫ\n\n`;
        diagText += `URL: ${report.url}\n`;
        diagText += `Заголовок: ${report.title}\n\n`;
        
        diagText += `🔍 НАЙДЕННЫЕ ЭЛЕМЕНТЫ:\n`;
        Object.entries(report.elements).forEach(([selector, count]) => {
            diagText += `${selector}: ${count} элементов\n`;
        });
        
        diagText += `\n📋 ВОЗМОЖНЫЕ KPI (${report.possibleKPIs.length}):\n`;
        report.possibleKPIs.forEach((kpi, i) => {
            diagText += `${i+1}. "${kpi.text}" (${kpi.selector})\n`;
        });
        
        diagText += `\n📊 ТАБЛИЦЫ (${report.tables.length}):\n`;
        report.tables.forEach((table, i) => {
            diagText += `${i+1}. ${table.selector}: ${table.rows} строк, ${table.cells} ячеек\n`;
            if (table.firstRowCells.length > 0) {
                diagText += `   Первая строка: [${table.firstRowCells.join(', ')}]\n`;
            }
        });
        
        diagText += `\n🔢 БОЛЬШИЕ ЧИСЛА:\n${report.numbers.join(', ')}\n`;
        
        const section = document.getElementById('current-data-section');
        section.innerHTML = `
            <h3>🔍 Диагностика страницы</h3>
            <pre style="white-space: pre-wrap; font-size: 11px; background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 400px; overflow-y: auto;">${diagText}</pre>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Проверьте консоль (F12) для подробной информации. 
                Если данные не находятся автоматически, пришлите этот отчет разработчику.
            </p>
        `;
        section.style.display = 'block';
    }

    closeOtherComparisonSections(keepOpen) {
        const sections = ['comparison-section', 'district-comparison-section'];
        
        sections.forEach(sectionId => {
            if (sectionId !== keepOpen) {
                const section = document.getElementById(sectionId);
                if (section && section.style.display !== 'none') {
                    section.classList.add('hiding');
                    setTimeout(() => {
                        section.style.display = 'none';
                        section.classList.remove('hiding');
                    }, 300);
                }
            }
        });
    }

    clearUI() {
        document.getElementById('comparison-section').style.display = 'none';
        document.getElementById('district-comparison-section').style.display = 'none';
        document.getElementById('current-data-section').style.display = 'none';
        
        const districtFilter = document.getElementById('district-filter-select');
        if (districtFilter) {
            districtFilter.selectedIndex = 0;
        }
    }
}

// Make available globally
window.UIManager = UIManager;