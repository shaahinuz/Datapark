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
        const periodFilterSelect = document.getElementById('period-filter-select');
        const startupPeriodSelect = document.getElementById('startup-period-select');
        
        select1.innerHTML = '';
        select2.innerHTML = '';
        if (periodFilterSelect) {
            periodFilterSelect.innerHTML = '<option value="">Выберите период...</option>';
        }
        if (startupPeriodSelect) {
            startupPeriodSelect.innerHTML = '<option value="">Выберите период...</option>';
        }

        if (periodKeys.length === 0) {
            select1.innerHTML = '<option value="">Нет сохраненных данных</option>';
            select2.innerHTML = '<option value="">Нет сохраненных данных</option>';
            if (startupPeriodSelect) {
                startupPeriodSelect.innerHTML = '<option value="">Нет сохраненных данных</option>';
            }
            return;
        }

        // Get unique base periods for the filter dropdown
        const basePeriods = new Set();
        periodKeys.forEach(key => {
            const periodText = key.replace('period_', '');
            // Extract base period (e.g., "2025-2Q" from "Анд-2025-2Q")
            const basePeriod = periodText.includes('-') ? 
                periodText.split('-').slice(-2).join('-') : periodText;
            basePeriods.add(basePeriod);
        });

        periodKeys.sort().reverse().forEach(key => {
            const optionText = key.replace('period_', '');
            select1.add(new Option(optionText, key));
            select2.add(new Option(optionText, key));
            
            if (startupPeriodSelect) {
                startupPeriodSelect.add(new Option(optionText, key));
            }
        });

        // Populate period filter dropdown with unique base periods
        if (periodFilterSelect) {
            Array.from(basePeriods).sort().reverse().forEach(basePeriod => {
                periodFilterSelect.add(new Option(basePeriod, basePeriod));
            });
        }

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
        section.classList.remove('hidden');
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
        companyChanges.added.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
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

        companyChanges.removed.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
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
        companyChanges.added.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            companyHtml += `<tr><td>${counter++}</td><td>${c.name}</td><td>${c.direction || ''}</td><td><span class="positive">Новая</span></td><td class="change-col"><span class="positive">+${c.employees}</span></td></tr>`;
        });

        companyChanges.changed.sort((a, b) => b.change - a.change).forEach(c => {
            const empChange = c.change || 0;
            if (empChange !== 0) {
                companyHtml += `<tr><td>${counter++}</td><td>${c.name}</td><td>${c.direction || ''}</td><td>Изменение</td><td class="change-col"><span class="${empChange > 0 ? 'positive' : 'negative'}">${empChange > 0 ? '+' : ''}${empChange}</span></td></tr>`;
            }
        });

        companyChanges.removed.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
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

    displayCompanyHistory(data) {
        const section = document.getElementById('company-history-section');
        const statsDiv = document.getElementById('company-stats');
        const timelineDiv = document.getElementById('company-timeline');

        console.log('History data received:', data);
        console.log('periodsData keys:', Object.keys(data.periodsData));
        
        const allCompanies = this.comparisonEngine.getAllCompanies(data.periodsData);
        console.log('All companies found:', allCompanies);
        
        if (allCompanies.length === 0) {
            statsDiv.innerHTML = '<h4>❌ Компании не найдены</h4><p>В сохраненных периодах нет данных о компаниях.</p>';
            timelineDiv.innerHTML = '';
            section.style.display = 'block';
            return;
        }
        
        let statsHtml = '<h4>🔍 Анализ конкретной компании</h4>';
        statsHtml += `<p style="color: #666; font-size: 12px;">Найдено ${allCompanies.length} уникальных компаний в ${Object.keys(data.periodsData).length} периодах</p>`;
        statsHtml += '<div style="margin-bottom: 15px;">';
        statsHtml += '<select id="company-select" style="width: 100%; padding: 8px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 13px;">';
        statsHtml += '<option value="">Выберите компанию...</option>';
        allCompanies.forEach((companyName, index) => {
            // Escape quotes in company names to prevent HTML attribute issues
            const escapedName = companyName.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            console.log(`Adding option ${index + 1}: "${companyName}" (escaped: "${escapedName}")`);
            statsHtml += `<option value="${escapedName}">${companyName}</option>`;
        });
        statsHtml += '</select>';
        statsHtml += '</div>';
        
        // Individual company display area
        statsHtml += '<div id="individual-company-display"></div>';

        statsDiv.innerHTML = statsHtml;

        // Add event listener to company select dropdown
        const companySelect = document.getElementById('company-select');
        console.log('companySelect element found:', !!companySelect);
        if (companySelect) {
            // Remove any existing event listeners
            companySelect.removeEventListener('change', this.companyChangeHandler);
            
            // Create a bound handler to maintain 'this' context
            this.companyChangeHandler = (e) => {
                console.log('Raw event target value:', e.target.value);
                console.log('Event target selectedIndex:', e.target.selectedIndex);
                if (e.target.selectedIndex > 0) {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    let selectedValue = selectedOption.value;
                    const selectedText = selectedOption.text;
                    
                    console.log('Selected option value:', selectedValue);
                    console.log('Selected option text:', selectedText);
                    
                    // If value is empty or escaped, use the text content
                    if (!selectedValue || selectedValue.includes('&quot;') || selectedValue.includes('&#39;')) {
                        selectedValue = selectedText;
                        console.log('Using text instead of value:', selectedValue);
                    }
                    
                    this.handleCompanySelection(selectedValue);
                } else {
                    console.log('No company selected (index 0)');
                    this.handleCompanySelection('');
                }
            };
            
            companySelect.addEventListener('change', this.companyChangeHandler);
            console.log('Event listener added to company select');
        } else {
            console.error('company-select element not found!');
        }

        // Hide timeline section completely
        timelineDiv.innerHTML = '';
        timelineDiv.style.display = 'none';

        // Store periods data for later use
        this.currentPeriodsData = data.periodsData;
        console.log('Stored periodsData for later use');

        this.closeOtherComparisonSections('company-history-section');
        section.style.display = 'block';
        section.classList.add('showing');
        section.scrollIntoView({ behavior: 'smooth' });
        
        setTimeout(() => {
            section.classList.remove('showing');
        }, 400);
    }

    handleCompanySelection(companyName) {
        console.log('handleCompanySelection called with:', companyName);
        console.log('this.currentPeriodsData exists:', !!this.currentPeriodsData);
        console.log('this.currentPeriodsData keys:', this.currentPeriodsData ? Object.keys(this.currentPeriodsData) : 'none');
        
        const displayDiv = document.getElementById('individual-company-display');
        
        console.log('displayDiv found:', !!displayDiv);
        
        if (companyName && this.currentPeriodsData) {
            console.log('Calling displayIndividualCompanyData...');
            this.displayIndividualCompanyData(this.currentPeriodsData, companyName);
        } else {
            console.log('Clearing displays - companyName:', companyName, 'currentPeriodsData:', !!this.currentPeriodsData);
            if (displayDiv) {
                displayDiv.innerHTML = '';
            }
        }
    }

    closeOtherComparisonSections(keepOpen) {
        const sections = ['comparison-section', 'district-comparison-section', 'company-history-section'];
        
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
        document.getElementById('company-history-section').style.display = 'none';
        
        const districtFilter = document.getElementById('district-filter-select');
        if (districtFilter) {
            districtFilter.selectedIndex = 0;
        }
    }

    displayIndividualCompanyData(periodsData, companyName) {
        const displayDiv = document.getElementById('individual-company-display');
        
        console.log('displayIndividualCompanyData called with:', companyName);
        console.log('periodsData:', periodsData);
        console.log('displayDiv found:', !!displayDiv);
        
        if (!displayDiv) {
            console.error('Display div not found');
            return;
        }

        if (!companyName) {
            console.log('No company name provided, clearing display');
            displayDiv.innerHTML = '';
            return;
        }

        const companyData = this.comparisonEngine.getCompanyData(periodsData, companyName);
        console.log('Company data retrieved:', companyData);
        
        let html = `<h5 style="margin-top: 15px;">📊 ${companyName}</h5>`;
        html += '<table class="company-table" style="width: 100%; margin-top: 10px;"><thead>';
        html += '<tr><th>Период</th><th>Количество сотрудников</th><th>Изменение</th></tr>';
        html += '</thead><tbody>';
        
        let rowsAdded = 0;
        let previousEmployees = null;
        
        companyData.periods.forEach((period, index) => {
            console.log(`Period ${index}:`, period);
            if (period.present) {
                const currentEmployees = period.employees || 0;
                let changeText = '-';
                let changeClass = '';
                
                if (previousEmployees !== null) {
                    const change = currentEmployees - previousEmployees;
                    if (change > 0) {
                        changeText = `+${change}`;
                        changeClass = 'positive';
                    } else if (change < 0) {
                        changeText = `${change}`;
                        changeClass = 'negative';
                    } else {
                        changeText = '0';
                        changeClass = '';
                    }
                } else {
                    changeText = 'Первое появление';
                    changeClass = 'positive';
                }
                
                html += `<tr>
                    <td><strong>${period.period}</strong></td>
                    <td>${currentEmployees}</td>
                    <td class="change-col"><span class="${changeClass}">${changeText}</span></td>
                </tr>`;
                
                previousEmployees = currentEmployees;
                rowsAdded++;
            }
        });
        
        
        if (rowsAdded === 0) {
            html += '<tr><td colspan="3" style="text-align: center; color: #666;">Нет данных для отображения</td></tr>';
        }
        
        html += '</tbody></table>';
        
        console.log('Setting HTML:', html);
        displayDiv.innerHTML = html;
    }


    displayRegionalData(regionalData, basePeriod) {
        const displayDiv = document.getElementById('regional-data-display');
        
        if (regionalData.length === 0) {
            displayDiv.innerHTML = `
                <div style="text-align: center; color: #666; padding: 20px;">
                    <h4>Нет данных для периода ${basePeriod}</h4>
                    <p>Региональные данные не найдены</p>
                </div>
            `;
            displayDiv.style.display = 'block';
            return;
        }

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0; color: #4a5568;">
                    📊 Регионы за период ${basePeriod} (найдено: ${regionalData.length})
                </h4>
                <button id="export-regional-csv-btn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 11px; margin: 0;">
                    📊 CSV
                </button>
            </div>
            <div class="table-container">
                <table class="company-table">
                    <thead>
                        <tr>
                            <th style="width: 25%;">Регион</th>
                            <th style="width: 20%;">Сотрудники</th>
                            <th style="width: 18%;">Компании</th>
                            <th style="width: 18%;">Доходы (млрд)</th>
                            <th style="width: 19%;">Экспорт (млн)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Sort regional data by employees count (descending)
        regionalData.sort((a, b) => b.employees - a.employees);

        regionalData.forEach(region => {
            const totalIncome = region.data.totalIncome || 0;
            const exportVolume = region.data.exportVolume || 0;
            
            html += `
                <tr>
                    <td style="font-weight: 600;">${region.regionName}</td>
                    <td style="text-align: center;">${region.employees.toLocaleString()}</td>
                    <td style="text-align: center;">${region.companies}</td>
                    <td style="text-align: center;">${totalIncome.toLocaleString()}</td>
                    <td style="text-align: center;">${exportVolume.toLocaleString()}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        displayDiv.innerHTML = html;
        displayDiv.style.display = 'block';
        
        // Store regional data for CSV export
        window.currentRegionalData = {
            data: regionalData,
            period: basePeriod
        };
        
        // Add event listener to export button
        const exportBtn = document.getElementById('export-regional-csv-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportRegionalDataToCSV(regionalData, basePeriod));
        }
    }

    exportRegionalDataToCSV(regionalData, basePeriod) {
        try {
            // Create CSV header with BOM for proper UTF-8 encoding
            const headers = ['Регион', 'Сотрудники', 'Компании', 'Доходы (млрд)', 'Экспорт (млн)'];
            let csvContent = '\uFEFF' + headers.join(',') + '\n'; // Add BOM for UTF-8
            
            // Add data rows
            regionalData.forEach(region => {
                const totalIncome = region.data.totalIncome || 0;
                const exportVolume = region.data.exportVolume || 0;
                
                const row = [
                    `"${region.regionName}"`,
                    region.employees,
                    region.companies,
                    totalIncome,
                    exportVolume
                ];
                csvContent += row.join(',') + '\n';
            });
            
            // Create and download file with proper UTF-8 encoding
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            // Generate filename with timestamp (using English characters for compatibility)
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `Regional_data_${basePeriod}_${timestamp}.csv`;
            link.setAttribute('download', filename);
            
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showStatus(`CSV файл "${filename}" загружен!`, 'success');
            
        } catch (error) {
            console.error('Error generating regional CSV:', error);
            this.showStatus(`Ошибка создания CSV: ${error.message}`, 'error');
        }
    }
}

// Make available globally
window.UIManager = UIManager;