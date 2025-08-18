// Global variables to store comparison results
let comparisonResult = {};

// Browser API compatibility - use chrome API for Chrome, browser API for Firefox
const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Extension popup loaded, DOM ready');
    try {
        setupEventListeners();
        loadSavedPeriodsIntoDropdowns();
        loadSavedDistrictsIntoDropdowns();
        console.log('Extension initialization complete');
    } catch (error) {
        console.error('Extension initialization error:', error);
    }
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Add click listeners with error handling
    const buttons = [
        { id: 'save-data-btn', handler: handleSaveData },
        { id: 'compare-btn', handler: handleCompare },
        { id: 'generate-csv-btn', handler: handleGenerateCSV },
        { id: 'generate-docx-btn', handler: handleGenerateDOCX },
        { id: 'show-current-btn', handler: handleShowCurrentData },
        { id: 'clear-cache-btn', handler: handleClearCache },
        { id: 'diagnose-btn', handler: handleDiagnose },
        { id: 'compare-districts-btn', handler: handleCompareDistricts },
        { id: 'generate-district-csv-btn', handler: handleGenerateDistrictCSV },
    ];
    
    buttons.forEach(({ id, handler }) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', (e) => {
                console.log(`Button clicked: ${id}`);
                try {
                    handler();
                } catch (error) {
                    console.error(`Error in ${id} handler:`, error);
                    showStatus(`Ошибка: ${error.message}`, 'error');
                }
            });
            console.log(`✓ Event listener added for ${id}`);
        } else {
            console.warn(`✗ Button not found: ${id}`);
        }
    });
    
    // Add event listener for district filter dropdown
    const districtFilter = document.getElementById('district-filter-select');
    if (districtFilter) {
        districtFilter.addEventListener('change', (e) => {
            const selectedDistrict = e.target.value;
            loadFilteredDistrictsIntoDropdowns(selectedDistrict);
        });
        console.log('✓ District filter event listener added');
    }
}

// --- CORE LOGIC ---

async function handleShowCurrentData() {
    showStatus('Считываю данные с экрана...', 'info');
    try {
        const pageData = await scrapeDashboardData();
        if (!pageData || !pageData.periodKey) {
            throw new Error("Не удалось определить период на странице.");
        }
        
        // Показываем подробную диагностику
        const { data } = pageData;
        console.log('📊 РЕЗУЛЬТАТЫ СКРАПИНГА:');
        console.log('- Резиденты:', data.totalResidents);
        console.log('- Сотрудники:', data.employeeCount);
        console.log('- Доход:', data.totalIncome);
        console.log('- Экспорт:', data.exportVolume);
        console.log('- Компании:', data.companies?.length);
        console.log('- Направления:', data.directions?.length);
        
        displayCurrentData(pageData);
        
        // Показываем результат диагностики в статусе
        const foundKPIs = [data.totalResidents, data.employeeCount, data.totalIncome, data.exportVolume].filter(x => x != null).length;
        const statusMsg = `Загружено: ${foundKPIs}/4 KPI, ${data.companies?.length || 0} компаний`;
        
        if (foundKPIs === 0 && (!data.companies || data.companies.length === 0)) {
            showStatus(`${statusMsg} ⚠️ Данные не найдены! Проверьте консоль (F12)`, 'error');
        } else if (foundKPIs < 4 || !data.companies || data.companies.length === 0) {
            showStatus(`${statusMsg} ⚠️ Неполные данные`, 'warning');
        } else {
            showStatus(`${statusMsg} ✅`, 'success');
        }
    } catch (error) {
        console.error('Error showing current data:', error);
        showStatus(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleSaveData() {
    showStatus('Считываю данные с экрана...', 'info');
    try {
        const pageData = await scrapeDashboardData();
        if (!pageData || !pageData.periodKey || pageData.periodKey.includes('YYYY') || pageData.periodKey.includes('Q_')) {
            throw new Error("Не удалось определить период на странице.");
        }
        
        // Get district name from input field
        const districtInput = document.getElementById('district-name-input');
        const districtName = districtInput.value.trim();
        
        // Create storage key with district prefix if specified
        let key, displayName;
        if (districtName) {
            key = `district_${districtName}_${pageData.periodKey}`;
            displayName = `${districtName}_${pageData.periodKey}`;
        } else {
            key = `period_${pageData.periodKey}`;
            displayName = pageData.periodKey;
        }
        
        await browserAPI.storage.local.set({ [key]: pageData.data });
        
        showStatus(`Данные за ${displayName} успешно сохранены!`, 'success');
        await loadSavedPeriodsIntoDropdowns();
        await loadSavedDistrictsIntoDropdowns();
    } catch (error) {
        console.error('Error saving data:', error);
        showStatus(`Ошибка сохранения: ${error.message}`, 'error');
    }
}

async function handleClearCache() {
    if (!confirm('Вы уверены, что хотите очистить весь кэш? Это удалит все сохраненные данные и сравнения.')) {
        return;
    }
    
    try {
        showStatus('Очищаю кэш...', 'info');
        
        // Получаем все ключи из storage
        const allData = await browserAPI.storage.local.get(null);
        const keysToRemove = Object.keys(allData);
        
        if (keysToRemove.length === 0) {
            showStatus('Кэш уже пуст.', 'info');
            return;
        }
        
        // Удаляем все данные
        await browserAPI.storage.local.remove(keysToRemove);
        
        // Очищаем глобальные переменные
        comparisonResult = {};
        
        // Очищаем UI
        document.getElementById('comparison-section').style.display = 'none';
        document.getElementById('district-comparison-section').style.display = 'none';
        document.getElementById('current-data-section').style.display = 'none';
        
        // Reset district filter
        const districtFilter = document.getElementById('district-filter-select');
        if (districtFilter) {
            districtFilter.selectedIndex = 0;
        }
        
        // Перезагружаем dropdown'ы
        await loadSavedPeriodsIntoDropdowns();
        await loadSavedDistrictsIntoDropdowns();
        
        showStatus(`Кэш очищен! Удалено ${keysToRemove.length} записей.`, 'success');
        
    } catch (error) {
        console.error('Error clearing cache:', error);
        showStatus(`Ошибка очистки кэша: ${error.message}`, 'error');
    }
}

async function handleDiagnose() {
    showStatus('Анализирую структуру страницы...', 'info');
    
    try {
        let [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('Нет активной вкладки');

        const [result] = await browserAPI.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const report = {
                    url: window.location.href,
                    title: document.title,
                    elements: {},
                    tables: [],
                    numbers: [],
                    possibleKPIs: []
                };

                // Анализ всех возможных селекторов KPI
                const kpiSelectors = [
                    '.staticBlockTitle',
                    '.stat-title', 
                    '.metric-title',
                    '.kpi-title',
                    '[class*="title"]',
                    '[class*="stat"]',
                    '[class*="metric"]',
                    '[class*="count"]',
                    'h1, h2, h3, h4, h5, h6'
                ];

                kpiSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        report.elements[selector] = elements.length;
                        
                        // Ищем элементы с ключевыми словами
                        elements.forEach(el => {
                            const text = el.innerText?.toLowerCase() || '';
                            if (text.includes('резидент') || text.includes('сотрудник') || 
                                text.includes('доход') || text.includes('экспорт') ||
                                text.includes('услуг') || text.includes('компани')) {
                                report.possibleKPIs.push({
                                    selector: selector,
                                    text: el.innerText?.trim(),
                                    className: el.className
                                });
                            }
                        });
                    }
                });

                // Анализ таблиц
                const tableSelectors = ['table', '.table', '.table-x', '[class*="table"]'];
                tableSelectors.forEach(selector => {
                    const tables = document.querySelectorAll(selector);
                    tables.forEach((table, i) => {
                        const rows = table.querySelectorAll('tr');
                        const cells = table.querySelectorAll('td, th');
                        report.tables.push({
                            selector: selector,
                            index: i,
                            rows: rows.length,
                            cells: cells.length,
                            className: table.className,
                            firstRowCells: Array.from(rows[0]?.querySelectorAll('td, th') || []).map(cell => cell.innerText?.trim()).slice(0, 5)
                        });
                    });
                });

                // Поиск больших чисел
                const allText = document.body.innerText;
                const numberMatches = allText.match(/\b\d{2,6}(?:[,\s]\d{3})*(?:\.\d+)?\b/g) || [];
                const uniqueNumbers = [...new Set(numberMatches)].slice(0, 20);
                report.numbers = uniqueNumbers;

                return report;
            }
        });

        const report = result.result;
        console.log('🔍 ДИАГНОСТИКА СТРАНИЦЫ:', report);
        
        // Формируем читаемый отчет
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
        
        // Показываем в секции current-data
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
        
        showStatus('Диагностика завершена. Смотрите результаты ниже.', 'success');
        
    } catch (error) {
        console.error('Diagnosis error:', error);
        showStatus(`Ошибка диагностики: ${error.message}`, 'error');
    }
}

async function handleCompare() {
    const key1 = document.getElementById('period1-select').value;
    const key2 = document.getElementById('period2-select').value;

    if (!key1 || !key2) {
        showStatus('Пожалуйста, выберите два периода для сравнения.', 'error');
        return;
    }
    
    showStatus('Сравниваю данные...', 'info');
    try {
        const storedData = await browserAPI.storage.local.get([key1, key2]);
        const data1 = storedData[key1];
        const data2 = storedData[key2];

        if (!data1 || !data2) {
            throw new Error("Не удалось загрузить данные для одного из периодов.");
        }
        
        const companyChanges = analyzeCompanyChanges(data1.companies, data2.companies);

        comparisonResult = {
            period1: { key: key1.replace('period_', ''), data: data1 },
            period2: { key: key2.replace('period_', ''), data: data2 },
            companyChanges: companyChanges
        };
        
        displayComparison(comparisonResult);
        showStatus('Сравнение готово.', 'success');
    } catch (error) {
        console.error('Error comparing data:', error);
        showStatus(`Ошибка сравнения: ${error.message}`, 'error');
    }
}


// --- DATA SCRAPING ---

async function scrapeDashboardData() {
    let [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (!tab) return null;

    const [result] = await browserAPI.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const dashboardData = {
                        totalResidents: null, employeeCount: null,
                        totalIncome: null, exportVolume: null,
                        companies: [],
                        directions: []
                    };

                    // Scrape main KPIs with debugging
                    console.log('DEBUG: Начинаем поиск KPI...');
                    
                    // Попробуем разные селекторы для KPI
                    const selectors = [
                        '.staticBlockTitle',
                        '.stat-title', 
                        '.metric-title',
                        '.kpi-title',
                        '[class*="title"]',
                        '[class*="label"]'
                    ];
                    
                    let foundTitles = [];
                    selectors.forEach(selector => {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            console.log(`DEBUG: Найдено ${elements.length} элементов с селектором ${selector}`);
                            elements.forEach((el, i) => {
                                console.log(`  ${i}: "${el.innerText?.trim()}" (${el.className})`);
                                foundTitles.push({selector, text: el.innerText?.trim(), element: el});
                            });
                        }
                    });
                    
                    // Ищем числовые значения на странице
                    const allElements = document.querySelectorAll('*');
                    const numbersFound = [];
                    allElements.forEach(el => {
                        const text = el.innerText?.trim() || '';
                        const numbers = text.match(/\b\d{1,6}(?:[,\s]\d{3})*(?:\.\d+)?\b/g);
                        if (numbers && text.length < 100 && el.children.length === 0) {
                            numbers.forEach(num => {
                                numbersFound.push({
                                    number: num,
                                    text: text,
                                    className: el.className,
                                    parent: el.parentElement?.className || ''
                                });
                            });
                        }
                    });
                    
                    console.log('DEBUG: Найденные числа:', numbersFound.slice(0, 20));
                    
                    // Старый способ
                    const allTitles = document.querySelectorAll('.staticBlockTitle');
                    console.log(`DEBUG: Найдено .staticBlockTitle: ${allTitles.length}`);
                    
                    allTitles.forEach((titleElement, index) => {
                        const titleText = titleElement.innerText.trim();
                        console.log(`DEBUG: Title ${index}: "${titleText}"`);
                        
                        const card = titleElement.closest('.staticBlockWrap');
                        if (card) {
                            const valueElement = card.querySelector('.staticBlockCount');
                            if (valueElement) {
                                const mainNumberText = valueElement.firstChild?.textContent.trim();
                                console.log(`DEBUG: Value for "${titleText}": "${mainNumberText}"`);
                                
                                if (mainNumberText) {
                                    const cleanValue = mainNumberText.replace(/\s/g, '').replace(/,/g, '.');
                                    console.log(`DEBUG: Clean value: "${cleanValue}"`);
                                    
                                    if (titleText.startsWith('Всего резидентов')) {
                                        dashboardData.totalResidents = parseInt(cleanValue, 10);
                                        console.log('DEBUG: Set totalResidents:', dashboardData.totalResidents);
                                    }
                                    else if (titleText.startsWith('Количество сотрудников')) {
                                        dashboardData.employeeCount = parseInt(cleanValue, 10);
                                        console.log('DEBUG: Set employeeCount:', dashboardData.employeeCount);
                                    }
                                    else if (titleText.startsWith('Совокупный доход')) {
                                        dashboardData.totalIncome = parseFloat(cleanValue);
                                        console.log('DEBUG: Set totalIncome:', dashboardData.totalIncome);
                                    }
                                    else if (titleText.startsWith('Объем экспорта')) {
                                        dashboardData.exportVolume = parseFloat(cleanValue);
                                        console.log('DEBUG: Set exportVolume:', dashboardData.exportVolume);
                                    }
                                }
                            } else {
                                console.log(`DEBUG: No .staticBlockCount found for "${titleText}"`);
                            }
                        } else {
                            console.log(`DEBUG: No .staticBlockWrap found for "${titleText}"`);
                        }
                    });
                    
                    // Альтернативный поиск если ничего не найдено
                    if (!dashboardData.totalResidents && !dashboardData.employeeCount && !dashboardData.totalIncome && !dashboardData.exportVolume) {
                        console.log('DEBUG: Пробуем альтернативный поиск...');
                        
                        // Ищем любые элементы с числами и ключевыми словами
                        const keywordSearch = [
                            {keywords: ['резидент', 'resident'], key: 'totalResidents', type: 'int'},
                            {keywords: ['сотрудник', 'employee', 'работник'], key: 'employeeCount', type: 'int'},
                            {keywords: ['доход', 'income', 'услуг', 'revenue'], key: 'totalIncome', type: 'float'},
                            {keywords: ['экспорт', 'export'], key: 'exportVolume', type: 'float'}
                        ];
                        
                        keywordSearch.forEach(search => {
                            if (!dashboardData[search.key]) {
                                const found = numbersFound.find(item => {
                                    const lowerText = item.text.toLowerCase();
                                    return search.keywords.some(keyword => lowerText.includes(keyword));
                                });
                                
                                if (found) {
                                    const value = search.type === 'int' ? 
                                        parseInt(found.number.replace(/[\s,]/g, ''), 10) :
                                        parseFloat(found.number.replace(/[\s,]/g, ''));
                                    dashboardData[search.key] = value;
                                    console.log(`DEBUG: Alternative search set ${search.key}:`, value);
                                }
                            }
                        });
                    }
                    
                    // Scrape company table with debugging
                    console.log('DEBUG: Поиск таблицы компаний...');
                    
                    const tableSelectors = ['.table-x tbody tr', 'table tbody tr', '.companies-table tbody tr', '.data-table tbody tr'];
                    let tableRows = [];
                    
                    tableSelectors.forEach(selector => {
                        const rows = document.querySelectorAll(selector);
                        if (rows.length > 0) {
                            console.log(`DEBUG: Найдено ${rows.length} строк с селектором ${selector}`);
                            tableRows = rows;
                            return;
                        }
                    });
                    
                    console.log(`DEBUG: Всего строк в таблице: ${tableRows.length}`);
                    
                    tableRows.forEach((row, rowIndex) => {
                        const cells = row.querySelectorAll('td, th');
                        console.log(`DEBUG: Строка ${rowIndex}: ${cells.length} ячеек`);
                        
                        if (rowIndex < 3) { // Показываем первые 3 строки для отладки
                            const cellTexts = Array.from(cells).map(cell => cell.innerText?.trim() || '').slice(0, 10);
                            console.log(`DEBUG: Содержимое строки ${rowIndex}:`, cellTexts);
                        }
                        
                        if (cells.length >= 9) {
                            const companyName = cells[2]?.innerText.trim();
                            const direction = cells[7]?.innerText.trim();
                            const totalEmployees = parseInt(cells[8]?.innerText.trim(), 10);
                            
                            if (companyName && !isNaN(totalEmployees)) {
                                dashboardData.companies.push({ name: companyName, employees: totalEmployees, direction: direction });
                                console.log(`DEBUG: Добавлена компания: ${companyName} (${totalEmployees} сотр.)`);
                            }
                        } else if (cells.length >= 3) {
                            // Попробуем другие варианты расположения данных
                            for (let i = 0; i < cells.length - 2; i++) {
                                const name = cells[i]?.innerText.trim();
                                const employees = parseInt(cells[cells.length - 1]?.innerText.trim(), 10);
                                const dir = cells[Math.min(i + 1, cells.length - 2)]?.innerText.trim();
                                
                                if (name && name.length > 3 && !isNaN(employees) && employees > 0) {
                                    dashboardData.companies.push({ name: name, employees: employees, direction: dir || '' });
                                    console.log(`DEBUG: Альтернативно добавлена компания: ${name} (${employees} сотр.)`);
                                    break;
                                }
                            }
                        }
                    });
                    
                    console.log(`DEBUG: Всего найдено компаний: ${dashboardData.companies.length}`);
                    
                    // Scrape directions summary from the correct block
                    document.querySelectorAll('.staticBlock').forEach(block => {
                        const titleEl = block.querySelector('.staticBlockTitle');
                        if (titleEl && titleEl.innerText.includes('По направлению деятельности')) {
                            const directionElements = block.querySelectorAll('.staticInnerBlock');
                            directionElements.forEach(el => {
                                const title = el.querySelector('.staticInnerBlockTitle')?.innerText.trim();
                                const value = el.querySelector('.staticInnerBlockValue')?.innerText.trim().split(' ')[0];
                                if (title && value) {
                                    dashboardData.directions.push({ name: title, count: parseInt(value, 10) });
                                }
                            });
                        }
                    });

                    // Get period key
                    const yearInput = document.querySelector('.year-select .el-input__inner');
                    const quarterInput = document.querySelector('.quarter-select .el-input__inner');
                    const year = yearInput ? yearInput.value.match(/\d{4}/)[0] : 'YYYY';
                    const quarterMatch = quarterInput ? quarterInput.value.match(/\d/) : null;
                    const quarter = quarterMatch ? `Q${quarterMatch[0]}` : 'Q_';
                    
                    resolve({
                        data: dashboardData,
                        periodKey: `${year}-${quarter}`
                    });
                }, 1000); // 1-second delay
            });
        }
    });
    return result ? result.result : null;
}


// --- Company Analysis ---
function analyzeCompanyChanges(companies1 = [], companies2 = []) {
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
            
            // Only add to changed if there's actually a meaningful change
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

// --- UI AND HELPER FUNCTIONS ---

async function loadSavedPeriodsIntoDropdowns() {
    const allData = await browserAPI.storage.local.get(null);
    const periodKeys = Object.keys(allData).filter(key => key.startsWith('period_'));
    
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

function displayCurrentData(pageData) {
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


function displayComparison(result) {
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

    const metrics = [
        { name: 'Всего резидентов', key: 'totalResidents', format: 0 },
        { name: 'Новые резиденты', key: 'newResidents', format: 0 },
        { name: 'Ушедшие резиденты', key: 'leftResidents', format: 0 },
        { name: 'Кол-во сотрудников', key: 'employeeCount', format: 0 },
        { name: 'Совокупный доход', key: 'totalIncome', format: 3 },
        { name: 'Объем экспорта', key: 'exportVolume', format: 3 }
    ];

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
    
    // Close other comparison sections and show this one with animation
    closeOtherComparisonSections('comparison-section');
    const section = document.getElementById('comparison-section');
    section.style.display = 'block';
    section.classList.add('showing');
    section.scrollIntoView({ behavior: 'smooth' });
    
    // Remove animation class after animation completes
    setTimeout(() => {
        section.classList.remove('showing');
    }, 400);
}

async function handleGenerateCSV() {
    if (!comparisonResult.period1) {
        showStatus('Сначала сравните данные.', 'error');
        return;
    }
    
    const templateCSV = await generatePeriodTemplateCSV(comparisonResult);
    downloadCSV(templateCSV, `regions_comparison_${comparisonResult.period1.key}_vs_${comparisonResult.period2.key}.csv`);

    showStatus('CSV файл в формате шаблона успешно сгенерирован!', 'success');
}

async function handleGenerateDOCX() {
    if (!comparisonResult.period1) {
        showStatus('Сначала сравните данные.', 'error');
        return;
    }
    
    showStatus('Генерирую DOCX отчет...', 'info');
    
    try {
        const docxContent = await generateUzbekReportDOCX(comparisonResult);
        downloadWordDocument(docxContent, `IT_report_${comparisonResult.period1.key}_vs_${comparisonResult.period2.key}.doc`);
        showStatus('Word документ успешно сгенерирован!', 'success');
    } catch (error) {
        console.error('Error generating DOCX:', error);
        showStatus(`Ошибка генерации DOCX: ${error.message}`, 'error');
    }
}

function generateSummaryCSV(result) {
    const { period1, period2, companyChanges } = result;
    const headers = ['Metric', `Value_${period1.key}`, `Value_${period2.key}`, 'Absolute_Change', 'Percentage_Change'];
    let csvContent = headers.join(',') + '\n';
    
    const metrics = [
        { name: 'Total Number of Residents', key: 'totalResidents', format: 0 },
        { name: 'Total Number of Employees', key: 'employeeCount', format: 0 },
        { name: 'Total Income (bln)', key: 'totalIncome', format: 2 },
        { name: 'Export Volume (mln)', key: 'exportVolume', format: 2 }
    ];

    metrics.forEach(metric => {
        const val1 = period1.data[metric.key];
        const val2 = period2.data[metric.key];
        if (val1 == null || val2 == null) return;
        const change = val1 - val2;
        const percentage = val2 ? ((change / val2) * 100).toFixed(2) : '0.00';
        csvContent += `"${metric.name}",${val1.toFixed(metric.format)},${val2.toFixed(metric.format)},${change.toFixed(metric.format)},${percentage > 0 ? '+' : ''}${percentage}%\n`;
    });

    csvContent += `"New Residents",${companyChanges.added.length},-,${companyChanges.added.length},N/A\n`;
    csvContent += `"Left Residents",-,${companyChanges.removed.length},-${companyChanges.removed.length},N/A\n`;

    return csvContent;
}

function generateCompanyCSV(result) {
    const { companyChanges } = result;
    const headers = ['No', 'Company_Name', 'Direction', 'Status', 'Employee_Change', 'Employees_New', 'Employees_Old'];
    let csvContent = headers.join(',') + '\n';
    
    let counter = 1;
    companyChanges.added.forEach(c => {
        csvContent += `${counter++},"${c.name}","${c.direction || ''}",New,${c.employees},${c.employees},0\n`;
    });
    companyChanges.removed.forEach(c => {
        csvContent += `${counter++},"${c.name}","${c.direction || ''}","Лишён статуса",-${c.employees},0,${c.employees}\n`;
    });
    companyChanges.changed.forEach(c => {
        csvContent += `${counter++},"${c.name}","${c.direction || ''}",Changed,${c.change},${c.newEmployees},${c.oldEmployees}\n`;
    });
    
    return csvContent;
}

function downloadCSV(csvContent, filename) {
    // Add UTF-8 BOM (Byte Order Mark) for proper encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

function downloadTextFile(textContent, filename) {
    // Add UTF-8 BOM for proper encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + textContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

function downloadWordDocument(textContent, filename) {
    // Format text with styling - numbers in red bold, percentages in blue bold
    let formattedContent = textContent
        // Format numbers (including decimals) in red and bold
        .replace(/(\d+(?:\.\d+)?)/g, '<span style="color: red; font-weight: bold;">$1</span>')
        // Format percentage signs and related text in blue and bold
        .replace(/(фоиз[^\s]*)/g, '<span style="color: blue; font-weight: bold;">$1</span>')
        .replace(/(%)/g, '<span style="color: blue; font-weight: bold;">$1</span>')
        // Format currency units
        .replace(/(млрд\.сўм|млн\.доллар)/g, '<span style="color: blue; font-weight: bold;">$1</span>');

    // Create a proper Word document using HTML format that can be opened by Word
    const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word">
<meta name="Originator" content="Microsoft Word">
<style>
@page { margin: 2cm; }
body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.6; }
p { margin: 0; margin-bottom: 15pt; text-align: justify; text-indent: 1.25cm; }
.header { text-align: center; font-weight: bold; font-size: 16pt; margin-bottom: 20pt; text-indent: 0; }
</style>
</head>
<body>
<p class="header">Datapark - АйТи Парк Ҳисоботи</p>
${formattedContent.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>').join('')}
</body>
</html>`;
    
    // Add UTF-8 BOM for proper encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + htmlContent], { type: 'application/msword;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.replace('.rtf', '.doc'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    // Auto-hide success messages after 3 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Helper function to smoothly close other comparison sections
function closeOtherComparisonSections(keepOpen) {
    const sections = ['comparison-section', 'district-comparison-section'];
    
    sections.forEach(sectionId => {
        if (sectionId !== keepOpen) {
            const section = document.getElementById(sectionId);
            if (section && section.style.display !== 'none') {
                // Add hiding animation
                section.classList.add('hiding');
                setTimeout(() => {
                    section.style.display = 'none';
                    section.classList.remove('hiding');
                }, 300); // Match CSS transition duration
            }
        }
    });
}

// --- DISTRICT COMPARISON FUNCTIONALITY ---

let districtComparisonResult = {};

async function loadSavedDistrictsIntoDropdowns() {
    const allData = await browserAPI.storage.local.get(null);
    const districtKeys = Object.keys(allData).filter(key => key.startsWith('district_'));
    
    // Extract unique district names for the filter dropdown
    const uniqueDistricts = new Set();
    districtKeys.forEach(key => {
        // Extract district name from key like "district_Marxamat_2025-Q2"
        const parts = key.replace('district_', '').split('_');
        if (parts.length >= 2) {
            uniqueDistricts.add(parts[0]); // First part is the district name
        }
    });
    
    // Populate the district filter dropdown
    const filterSelect = document.getElementById('district-filter-select');
    filterSelect.innerHTML = '<option value="">Выберите район для фильтрации...</option>';
    
    Array.from(uniqueDistricts).sort().forEach(district => {
        filterSelect.add(new Option(district, district));
    });
    
    // Reset comparison dropdowns to disabled state
    const select1 = document.getElementById('district1-select');
    const select2 = document.getElementById('district2-select');
    select1.innerHTML = '<option value="">Сначала выберите район выше</option>';
    select2.innerHTML = '<option value="">Сначала выберите район выше</option>';
    select1.disabled = true;
    select2.disabled = true;
}

async function loadFilteredDistrictsIntoDropdowns(selectedDistrict) {
    const allData = await browserAPI.storage.local.get(null);
    const districtKeys = Object.keys(allData).filter(key => key.startsWith('district_'));
    
    const select1 = document.getElementById('district1-select');
    const select2 = document.getElementById('district2-select');
    
    if (!selectedDistrict) {
        // If no district selected, disable dropdowns
        select1.innerHTML = '<option value="">Сначала выберите район выше</option>';
        select2.innerHTML = '<option value="">Сначала выберите район выше</option>';
        select1.disabled = true;
        select2.disabled = true;
        return;
    }
    
    // Filter keys for the selected district
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

async function handleCompareDistricts() {
    const key1 = document.getElementById('district1-select').value;
    const key2 = document.getElementById('district2-select').value;

    if (!key1 || !key2) {
        showStatus('Пожалуйста, выберите два района для сравнения.', 'error');
        return;
    }
    
    showStatus('Сравниваю данные районов...', 'info');
    try {
        const storedData = await browserAPI.storage.local.get([key1, key2]);
        const data1 = storedData[key1];
        const data2 = storedData[key2];

        if (!data1 || !data2) {
            throw new Error("Не удалось загрузить данные для одного из районов.");
        }
        
        const companyChanges = analyzeCompanyChanges(data1.companies, data2.companies);

        districtComparisonResult = {
            period1: { key: key1.replace('district_', ''), data: data1 },
            period2: { key: key2.replace('district_', ''), data: data2 },
            companyChanges: companyChanges
        };
        
        displayDistrictComparison(districtComparisonResult);
        showStatus('Сравнение районов готово.', 'success');
    } catch (error) {
        console.error('Error comparing districts:', error);
        showStatus(`Ошибка сравнения районов: ${error.message}`, 'error');
    }
}

function displayDistrictComparison(result) {
    const section = document.getElementById('district-comparison-section');
    const dataDiv = document.getElementById('district-comparison-data');
    const companySection = document.getElementById('district-company-comparison-section');
    
    const { period1, period2, companyChanges } = result;
    const data1 = period1.data;
    const data2 = period2.data;

    // Display KPI comparison (same as main comparison)
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

        // Format numbers based on metric type
        let currentDisplay, previousDisplay, changeDisplay;
        if (metric.name.includes('Доход') || metric.name.includes('Экспорт')) {
            // Format with 3 decimal places for income and export
            currentDisplay = current.toFixed(3);
            previousDisplay = previous.toFixed(3);
            changeDisplay = change.toFixed(3);
        } else {
            // Keep integers for residents and employees
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

    // Display company changes (same logic as main comparison)
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
    
    // Close other comparison sections and show this one with animation
    closeOtherComparisonSections('district-comparison-section');
    section.style.display = 'block';
    section.classList.add('showing');
    section.scrollIntoView({ behavior: 'smooth' });
    
    // Remove animation class after animation completes
    setTimeout(() => {
        section.classList.remove('showing');
    }, 400);
}

async function handleGenerateDistrictCSV() {
    if (!districtComparisonResult.period1) {
        showStatus('Сначала сравните районы.', 'error');
        return;
    }
    
    const templateCSV = await generateTemplateCSV(districtComparisonResult);
    const districtName = extractDistrictName(districtComparisonResult.period1.key);
    downloadCSV(templateCSV, `comparison_${districtName}_${extractPeriod(districtComparisonResult.period1.key)}_vs_${extractPeriod(districtComparisonResult.period2.key)}.csv`);

    showStatus('CSV файл в формате шаблона успешно сгенерирован!', 'success');
}

async function generateTemplateCSV(result) {
    const { period1, period2 } = result;
    
    // Extract district name and periods
    const districtName = extractDistrictName(period1.key);
    const period1Year = extractYear(period1.key);
    const period1Quarter = extractQuarter(period1.key);
    const period2Year = extractYear(period2.key);
    const period2Quarter = extractQuarter(period2.key);
    
    // Try to get corresponding whole region data
    const regionPeriod1Key = `period_${period1Year}-${period1Quarter}`;
    const regionPeriod2Key = `period_${period2Year}-${period2Quarter}`;
    
    const storedData = await browserAPI.storage.local.get([regionPeriod1Key, regionPeriod2Key]);
    const regionData1 = storedData[regionPeriod1Key];
    const regionData2 = storedData[regionPeriod2Key];
    
    // CSV Header with proper column alignment - unite BCDE and F-M headers
    let csvContent = '';
    csvContent += `,,"<b>${period2Year} йил ${getUzbekQuarterText(period2Quarter)}</b>",,,"<b>${period1Year} йил ${getUzbekQuarterText(period1Quarter)}</b>",,,,,\n`;
    
    // Table headers - make them bold
    csvContent += '"<b>Ҳудудлар</b>",';
    csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>","<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Экспорт (минг АҚШ доллари)</b>",';
    csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>",';
    csvContent += '"<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>",';
    csvContent += '"<b>Экспорт (минг АҚШ доллари)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>"\n';
    
    // Жами (Whole region) row
    csvContent += 'Жами:,';
    if (regionData2) {
        csvContent += `${regionData2.totalResidents || 0},`;
        csvContent += `${regionData2.employeeCount || 0},`;
        csvContent += `${(regionData2.totalIncome || 0).toFixed(2)},`;
        csvContent += `${(regionData2.exportVolume || 0).toFixed(2)},`;
    } else {
        csvContent += 'Data not saved,Data not saved,Data not saved,Data not saved,';
    }
    
    if (regionData1) {
        csvContent += `${regionData1.totalResidents || 0},`;
        csvContent += `${regionData1.employeeCount || 0},`;
        
        // Calculate changes for region
        if (regionData2 && regionData1) {
            const incomeChange = (regionData1.totalIncome || 0) - (regionData2.totalIncome || 0);
            const incomeGrowthRate = regionData2.totalIncome ? ((incomeChange / regionData2.totalIncome) * 100) : 0;
            csvContent += `${(regionData1.totalIncome || 0).toFixed(2)},`;
            csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(2)},`;
            csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
            
            const exportChange = (regionData1.exportVolume || 0) - (regionData2.exportVolume || 0);
            const exportGrowthRate = regionData2.exportVolume ? ((exportChange / regionData2.exportVolume) * 100) : 0;
            csvContent += `${(regionData1.exportVolume || 0).toFixed(2)},`;
            csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(2)},`;
            csvContent += `${exportGrowthRate.toFixed(2)}%`;
        } else {
            csvContent += `${(regionData1.totalIncome || 0).toFixed(2)},Data not saved,Data not saved,`;
            csvContent += `${(regionData1.exportVolume || 0).toFixed(2)},Data not saved,Data not saved`;
        }
    } else {
        csvContent += 'Data not saved,Data not saved,Data not saved,Data not saved,Data not saved,Data not saved';
    }
    csvContent += '\n';
    
    // District row
    csvContent += `${districtName},`;
    
    // Period 2 (older) data
    csvContent += `${period2.data.totalResidents || 0},`;
    csvContent += `${period2.data.employeeCount || 0},`;
    csvContent += `${(period2.data.totalIncome || 0).toFixed(2)},`;
    csvContent += `${(period2.data.exportVolume || 0).toFixed(2)},`;
    
    // Period 1 (newer) data
    csvContent += `${period1.data.totalResidents || 0},`;
    csvContent += `${period1.data.employeeCount || 0},`;
    
    // Calculate changes for district
    const incomeChange = (period1.data.totalIncome || 0) - (period2.data.totalIncome || 0);
    const incomeGrowthRate = period2.data.totalIncome ? ((incomeChange / period2.data.totalIncome) * 100) : 0;
    csvContent += `${(period1.data.totalIncome || 0).toFixed(2)},`;
    csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(2)},`;
    csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
    
    const exportChange = (period1.data.exportVolume || 0) - (period2.data.exportVolume || 0);
    const exportGrowthRate = period2.data.exportVolume ? ((exportChange / period2.data.exportVolume) * 100) : 0;
    csvContent += `${(period1.data.exportVolume || 0).toFixed(2)},`;
    csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(2)},`;
    csvContent += `${exportGrowthRate.toFixed(2)}%`;
    
    return csvContent;
}

async function generatePeriodTemplateCSV(result) {
    const { period1, period2 } = result;
    
    // Extract periods
    const period1Year = extractYear(period1.key);
    const period1Quarter = extractQuarter(period1.key);
    const period2Year = extractYear(period2.key);
    const period2Quarter = extractQuarter(period2.key);
    
    // Get all district data for these periods
    const allData = await browserAPI.storage.local.get(null);
    const period1Districts = Object.keys(allData)
        .filter(key => key.startsWith('district_') && key.includes(`${period1Year}-${period1Quarter}`))
        .map(key => ({
            key,
            name: extractDistrictName(key.replace('district_', '')),
            data: allData[key]
        }));
    
    const period2Districts = Object.keys(allData)
        .filter(key => key.startsWith('district_') && key.includes(`${period2Year}-${period2Quarter}`))
        .map(key => ({
            key,
            name: extractDistrictName(key.replace('district_', '')),
            data: allData[key]
        }));
    
    // CSV Header with proper column alignment - unite BCDE and F-M headers
    let csvContent = '';
    csvContent += `,,"<b>${period2Year} йил ${getUzbekQuarterText(period2Quarter)}</b>",,,"<b>${period1Year} йил ${getUzbekQuarterText(period1Quarter)}</b>",,,,,\n`;
    
    // Table headers - make them bold
    csvContent += '"<b>Ҳудудлар</b>",';
    csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>","<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Экспорт (минг АҚШ доллари)</b>",';
    csvContent += '"<b>Резидентлар сони</b>","<b>Ходимлар сони</b>",';
    csvContent += '"<b>Хизматлар ҳажми (млрд. сум)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>",';
    csvContent += '"<b>Экспорт (минг АҚШ доллари)</b>","<b>Ўсиш (+/-)</b>","<b>Ўсиш сурьати (%)</b>"\n';
    
    // Жами (Whole region) row - using the main comparison data
    csvContent += 'Жами:,';
    csvContent += `${period2.data.totalResidents || 0},`;
    csvContent += `${period2.data.employeeCount || 0},`;
    csvContent += `${(period2.data.totalIncome || 0).toFixed(2)},`;
    csvContent += `${(period2.data.exportVolume || 0).toFixed(2)},`;
    csvContent += `${period1.data.totalResidents || 0},`;
    csvContent += `${period1.data.employeeCount || 0},`;
    
    // Calculate changes for region
    const incomeChange = (period1.data.totalIncome || 0) - (period2.data.totalIncome || 0);
    const incomeGrowthRate = period2.data.totalIncome ? ((incomeChange / period2.data.totalIncome) * 100) : 0;
    csvContent += `${(period1.data.totalIncome || 0).toFixed(2)},`;
    csvContent += `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(2)},`;
    csvContent += `${incomeGrowthRate.toFixed(2)}%,`;
    
    const exportChange = (period1.data.exportVolume || 0) - (period2.data.exportVolume || 0);
    const exportGrowthRate = period2.data.exportVolume ? ((exportChange / period2.data.exportVolume) * 100) : 0;
    csvContent += `${(period1.data.exportVolume || 0).toFixed(2)},`;
    csvContent += `${exportChange > 0 ? '+' : ''}${exportChange.toFixed(2)},`;
    csvContent += `${exportGrowthRate.toFixed(2)}%\n`;
    
    // Get unique district names from both periods
    const allDistrictNames = new Set();
    period1Districts.forEach(d => allDistrictNames.add(d.name));
    period2Districts.forEach(d => allDistrictNames.add(d.name));
    
    // Sort district names
    const sortedDistricts = Array.from(allDistrictNames).sort();
    
    // Add each district row
    sortedDistricts.forEach(districtName => {
        const district1 = period1Districts.find(d => d.name === districtName);
        const district2 = period2Districts.find(d => d.name === districtName);
        
        csvContent += `${districtName},`;
        
        // Period 2 (older) data
        if (district2) {
            csvContent += `${district2.data.totalResidents || 0},`;
            csvContent += `${district2.data.employeeCount || 0},`;
            csvContent += `${(district2.data.totalIncome || 0).toFixed(2)},`;
            csvContent += `${(district2.data.exportVolume || 0).toFixed(2)},`;
        } else {
            csvContent += 'No data,No data,No data,No data,';
        }
        
        // Period 1 (newer) data
        if (district1) {
            csvContent += `${district1.data.totalResidents || 0},`;
            csvContent += `${district1.data.employeeCount || 0},`;
            
            // Calculate changes for this district
            if (district2) {
                const distIncomeChange = (district1.data.totalIncome || 0) - (district2.data.totalIncome || 0);
                const distIncomeGrowthRate = district2.data.totalIncome ? ((distIncomeChange / district2.data.totalIncome) * 100) : 0;
                csvContent += `${(district1.data.totalIncome || 0).toFixed(2)},`;
                csvContent += `${distIncomeChange > 0 ? '+' : ''}${distIncomeChange.toFixed(2)},`;
                csvContent += `${distIncomeGrowthRate.toFixed(2)}%,`;
                
                const distExportChange = (district1.data.exportVolume || 0) - (district2.data.exportVolume || 0);
                const distExportGrowthRate = district2.data.exportVolume ? ((distExportChange / district2.data.exportVolume) * 100) : 0;
                csvContent += `${(district1.data.exportVolume || 0).toFixed(2)},`;
                csvContent += `${distExportChange > 0 ? '+' : ''}${distExportChange.toFixed(2)},`;
                csvContent += `${distExportGrowthRate.toFixed(2)}%`;
            } else {
                csvContent += `${(district1.data.totalIncome || 0).toFixed(2)},New district,New district,`;
                csvContent += `${(district1.data.exportVolume || 0).toFixed(2)},New district,New district`;
            }
        } else {
            csvContent += 'No data,No data,No data,No data,No data,No data,No data,No data';
        }
        csvContent += '\n';
    });
    
    return csvContent;
}

async function generateUzbekReportDOCX(result) {
    const { period1, period2 } = result;
    const data1 = period1.data;
    const data2 = period2.data;
    
    // Extract years and quarters
    const year1 = extractYear(period1.key);
    const quarter1 = extractQuarter(period1.key);
    const year2 = extractYear(period2.key);
    const quarter2 = extractQuarter(period2.key);
    
    // Helper function to get quarter text in Uzbek
    const getQuarterText = (quarter) => {
        switch(quarter) {
            case 'Q1': return '1-чорак';
            case 'Q2': return '2-чорак';
            case 'Q3': return '3-чорак';
            case 'Q4': return '4-чорак';
            default: return quarter;
        }
    };
    
    // Helper function to get period text (for half-year)
    const getPeriodText = (quarter) => {
        if (quarter === 'Q1' || quarter === 'Q2') return '1-ярим йиллик';
        return '2-ярим йиллик';
    };
    
    // Calculate metrics
    const residentsOld = data2.totalResidents || 0;
    const residentsNew = data1.totalResidents || 0;
    const residentsGrowth = residentsOld ? Math.round(((residentsNew - residentsOld) / residentsOld) * 100) : 0;
    
    const employeesOld = data2.employeeCount || 0;
    const employeesNew = data1.employeeCount || 0;
    const employeesGrowth = employeesOld ? Math.round(((employeesNew - employeesOld) / employeesOld) * 100) : 0;
    
    const incomeOld = data2.totalIncome || 0;
    const incomeNew = data1.totalIncome || 0;
    const incomeMultiplier = incomeOld ? (incomeNew / incomeOld).toFixed(1) : 0;
    
    const exportOld = data2.exportVolume || 0;
    const exportNew = data1.exportVolume || 0;
    const exportGrowth = exportOld ? Math.round(((exportNew - exportOld) / exportOld) * 100) : 0;
    
    // Calculate growth percentages for new format with 2 decimal places
    const residentsGrowthPercent = residentsOld ? ((residentsNew / residentsOld) * 100).toFixed(2) : '0.00';
    const employeesGrowthPercent = employeesOld ? ((employeesNew / employeesOld) * 100).toFixed(2) : '0.00';
    const incomeGrowthPercent = incomeOld ? ((incomeNew / incomeOld) * 100).toFixed(2) : '0.00';
    const exportGrowthPercent = exportOld ? ((exportNew / exportOld) * 100).toFixed(2) : '0.00';
    
    // Generate the report in the new format with 2 decimal places for financial values
    let report = `1. АйТи Парк резидентлари сони ${year2} йил ${getQuarterText(quarter2)} ${residentsOld} тани ташкил этган бўлса, ${year1} йил ${getQuarterText(quarter1)} ${residentsNew} тага етказилди (ўсиш суръати ${residentsGrowthPercent} фоизни ташкил этди) 

2. АйТи парк резидентлари томонидан иш билан таъминланганлар сони ${year2} йил ${getQuarterText(quarter2)} ${employeesOld} нафарни ташкил этган бўлса, ушбу кўрсаткич ${year1} йил ${getQuarterText(quarter1)} ${employeesNew} нафарга етди (ўсиш суръати ${employeesGrowthPercent} фоизни ташкил этди).

3. Кўрсатилган хизматлар ҳажми ${year2} йил ${getQuarterText(quarter2)} ${incomeOld.toFixed(2)} млрд.сўм ни ташкил этган бўлса ${year1} йил ${getQuarterText(quarter1)} ${incomeNew.toFixed(2)} млрд.сўмга етиб, ${incomeGrowthPercent} фоизга ошди.

4. Шунингдек, ${year2} йил ${getQuarterText(quarter2)} резидентлар томонидан хизматлар экспорт ҳажми ${exportOld.toFixed(2)} млн.долларни ни ташкил этган бўлса, ушбу кўрсаткич ${year1} йил ${getQuarterText(quarter1)} ${exportNew.toFixed(2)} млн долларлик хизматлар экспорт қилинди.(ўсиш суръати ${exportGrowthPercent} фоизни ташкил этди)`;
    
    return report;
}

// Helper functions to extract information from keys
function extractDistrictName(key) {
    // Extract from "Asaka_2025-Q2" -> "Asaka"
    const parts = key.split('_');
    return parts[0];
}

function extractPeriod(key) {
    // Extract from "Asaka_2025-Q2" -> "2025-Q2"
    const parts = key.split('_');
    return parts.slice(1).join('_');
}

function extractYear(key) {
    // Extract from "Asaka_2025-Q2" -> "2025"
    const match = key.match(/(\d{4})/);
    return match ? match[1] : 'YYYY';
}

function extractQuarter(key) {
    // Extract from "Asaka_2025-Q2" -> "Q2"
    const match = key.match(/Q(\d)/);
    return match ? `Q${match[1]}` : 'Q1';
}

function getUzbekQuarterText(quarter) {
    switch(quarter) {
        case 'Q1': return '1-чорак';
        case 'Q2': return '2-чорак';
        case 'Q3': return '3-чорак';
        case 'Q4': return '4-чорак';
        default: return quarter;
    }
}
