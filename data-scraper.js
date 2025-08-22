// Data scraping functionality for IT Park dashboard
class DataScraper {
    constructor() {
        this.browserAPI = typeof chrome !== 'undefined' ? chrome : browser;
    }

    async scrapeDashboardData() {
        let [tab] = await this.browserAPI.tabs.query({ active: true, currentWindow: true });
        if (!tab) return null;

        const [result] = await this.browserAPI.scripting.executeScript({
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

                        // Scrape main KPIs
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
                                elements.forEach((el, i) => {
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
                        
                        
                        // Старый способ
                        const allTitles = document.querySelectorAll('.staticBlockTitle');
                        
                        allTitles.forEach((titleElement, index) => {
                            const titleText = titleElement.innerText.trim();
                            
                            const card = titleElement.closest('.staticBlockWrap');
                            if (card) {
                                const valueElement = card.querySelector('.staticBlockCount');
                                if (valueElement) {
                                    const mainNumberText = valueElement.firstChild?.textContent.trim();
                                    
                                    if (mainNumberText) {
                                        const cleanValue = mainNumberText.replace(/\s/g, '').replace(/,/g, '.');
                                        
                                        if (titleText.startsWith('Всего резидентов')) {
                                            dashboardData.totalResidents = parseInt(cleanValue, 10);
                                        }
                                        else if (titleText.startsWith('Количество сотрудников')) {
                                            dashboardData.employeeCount = parseInt(cleanValue, 10);
                                        }
                                        else if (titleText.startsWith('Совокупный доход')) {
                                            dashboardData.totalIncome = parseFloat(cleanValue);
                                        }
                                        else if (titleText.startsWith('Объем экспорта')) {
                                            dashboardData.exportVolume = parseFloat(cleanValue);
                                        }
                                    }
                                } else {
                                }
                            } else {
                            }
                        });
                        
                        // Альтернативный поиск если ничего не найдено
                        if (!dashboardData.totalResidents && !dashboardData.employeeCount && !dashboardData.totalIncome && !dashboardData.exportVolume) {
                            
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
                                    }
                                }
                            });
                        }
                        
                        // Scrape company table
                        
                        const tableSelectors = ['.table-x tbody tr', 'table tbody tr', '.companies-table tbody tr', '.data-table tbody tr'];
                        let tableRows = [];
                        
                        tableSelectors.forEach(selector => {
                            const rows = document.querySelectorAll(selector);
                            if (rows.length > 0) {
                                tableRows = rows;
                                return;
                            }
                        });
                        
                        
                        tableRows.forEach((row, rowIndex) => {
                            const cells = row.querySelectorAll('td, th');
                            
                            if (rowIndex < 3) {
                                const cellTexts = Array.from(cells).map(cell => cell.innerText?.trim() || '').slice(0, 10);
                            }
                            
                            if (cells.length >= 9) {
                                const companyName = cells[2]?.innerText.trim();
                                const direction = cells[7]?.innerText.trim();
                                const totalEmployees = parseInt(cells[8]?.innerText.trim(), 10);
                                
                                if (companyName && !isNaN(totalEmployees)) {
                                    dashboardData.companies.push({ name: companyName, employees: totalEmployees, direction: direction });
                                }
                            } else if (cells.length >= 3) {
                                for (let i = 0; i < cells.length - 2; i++) {
                                    const name = cells[i]?.innerText.trim();
                                    const employees = parseInt(cells[cells.length - 1]?.innerText.trim(), 10);
                                    const dir = cells[Math.min(i + 1, cells.length - 2)]?.innerText.trim();
                                    
                                    if (name && name.length > 3 && !isNaN(employees) && employees > 0) {
                                        dashboardData.companies.push({ name: name, employees: employees, direction: dir || '' });
                                        break;
                                    }
                                }
                            }
                        });
                        
                        
                        // Scrape directions summary
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

                        // Get period key with support for "весь год"
                        const yearInput = document.querySelector('.year-select .el-input__inner');
                        const quarterInput = document.querySelector('.quarter-select .el-input__inner');
                        const year = yearInput ? yearInput.value.match(/\d{4}/)?.[0] : 'YYYY';
                        
                        let quarter = 'Q_';
                        if (quarterInput) {
                            const quarterText = quarterInput.value.toLowerCase();
                            if (quarterText.includes('весь год') || quarterText.includes('whole year') || quarterText.includes('all year')) {
                                quarter = 'ALL';
                            } else {
                                const quarterMatch = quarterText.match(/\d/);
                                quarter = quarterMatch ? `Q${quarterMatch[0]}` : 'Q_';
                            }
                        }
                        
                        // Try to auto-detect district name from page
                        let detectedDistrict = null;
                        const detectionLog = [];
                        
                        
                        // Method 1: Check URL for district parameter  
                        const urlParams = new URLSearchParams(window.location.search);
                        const districtParam = urlParams.get('district') || urlParams.get('rayon') || urlParams.get('tuman') || urlParams.get('region');
                        if (districtParam && districtParam !== 'all' && districtParam !== 'null') {
                            detectedDistrict = districtParam;
                            detectionLog.push(`URL param: ${districtParam}`);
                        }
                        
                        // Method 2: Look for district/rayon selector (more specific)
                        if (!detectedDistrict) {
                            const districtSelectors = [
                                '.district-select .el-input__inner',
                                '.rayon-select .el-input__inner', 
                                '.tuman-select .el-input__inner',
                                '.region-select .el-input__inner',
                                '[placeholder*="район"]',
                                '[placeholder*="тума"]',
                                '[placeholder*="регион"]',
                                '.breadcrumb .district',
                                '.current-district',
                                '.el-select__input',
                                '.ant-select-selection-item'
                            ];
                            
                            console.log('Checking selectors for district info...');
                            for (const selector of districtSelectors) {
                                const elements = document.querySelectorAll(selector);
                                console.log(`Selector ${selector}: found ${elements.length} elements`);
                                
                                elements.forEach((element, i) => {
                                    const value = element.value || element.innerText || element.textContent || '';
                                    console.log(`  Element ${i}: "${value.trim()}"`);
                                    
                                    if (value && 
                                        value !== 'Все районы' && 
                                        value !== 'Выберите район' &&
                                        value !== 'Все регионы' &&
                                        value !== 'Выберите регион' &&
                                        value.length > 2 &&
                                        !value.includes('Выберите') &&
                                        !value.includes('Все')) {
                                        detectedDistrict = value.trim();
                                        detectionLog.push(`Selector ${selector}: ${value.trim()}`);
                                        return;
                                    }
                                });
                                
                                if (detectedDistrict) break;
                            }
                        }
                        
                        // Method 3: Look in page content for district indicators
                        if (!detectedDistrict) {
                            // Search for text patterns that indicate district
                            const textSelectors = [
                                'h1', 'h2', 'h3', '.page-title', '.section-title', 
                                '.district-name', '.location-info', '.breadcrumb'
                            ];
                            
                            for (const selector of textSelectors) {
                                const elements = document.querySelectorAll(selector);
                                for (const element of elements) {
                                    const text = element.innerText || '';
                                    
                                    // Look for "район", "тумани", "туман" keywords
                                    const districtPatterns = [
                                        /([А-Яа-я\s]+)\s+район/i,
                                        /([А-Яа-я\s]+)\s+тумани/i, 
                                        /([А-Яа-я\s]+)\s+туман/i,
                                        /района\s+([А-Яа-я\s]+)/i,
                                        /тумани\s+([А-Яа-я\s]+)/i
                                    ];
                                    
                                    for (const pattern of districtPatterns) {
                                        const match = text.match(pattern);
                                        if (match && match[1] && match[1].trim().length > 2) {
                                            detectedDistrict = match[1].trim();
                                            break;
                                        }
                                    }
                                    
                                    if (detectedDistrict) break;
                                }
                                if (detectedDistrict) break;
                            }
                        }
                        
                        // Method 4: Simple text-based detection for common cases  
                        if (!detectedDistrict) {
                            console.log('Method 4: Checking page text for district names...');
                            
                            // Get all text from page but focus on key areas
                            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.innerText).join(' ');
                            const breadcrumbs = Array.from(document.querySelectorAll('.breadcrumb, .breadcrumb-item, [class*="breadcrumb"]')).map(b => b.innerText).join(' ');
                            const pageTitle = document.title;
                            const focusedText = `${pageTitle} ${headings} ${breadcrumbs}`;
                            
                            console.log('Focused text for analysis:', focusedText);
                            
                            // Look for current page indicator patterns
                            const currentPagePatterns = [
                                /текущий.*?район.*?([А-Яа-я\w\s]{3,20})/i,
                                /район.*?([А-Яа-я\w\s]{3,20})/i,
                                /([А-Яа-я\w\s]{3,20}).*?район/i,
                                /выбран.*?([А-Яа-я\w\s]{3,20})/i
                            ];
                            
                            for (const pattern of currentPagePatterns) {
                                const match = focusedText.match(pattern);
                                if (match && match[1]) {
                                    const candidate = match[1].trim();
                                    if (candidate.length >= 3 && candidate.length <= 20 && 
                                        !candidate.includes('все') && !candidate.includes('выберите')) {
                                        detectedDistrict = candidate;
                                        detectionLog.push(`Text pattern: ${candidate}`);
                                        console.log('Found district via text pattern:', candidate);
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // Method 5: Precise district name matching with known list
                        if (!detectedDistrict) {
                            console.log('Method 5: Precise district matching...');
                            const pageText = document.body.innerText || '';
                            
                            // Sort districts by length (longest first) to prevent substring matches
                            // Include regions (область) that should be saved as general data
                            const knownDistricts = [
                                'Андижанская область', 'Quyi Chirchiq', 'Yuqori Chirchiq', 'Qo\'rg\'ontepa', 'Shayxontohur',
                                'Buloqboshi', 'Jalolquduq', 'Oqqo\'rg\'on', 'Oltinko\'l', 'Paxtaobod', 
                                'Shahrikhon', 'Xo\'jaobod', 'Chilonzor', 'Marxamat', 'Yangiyo\'l',
                                'Baliqchi', 'Bekobod', 'Chinoz', 'Izboskan', 'Mirobod', 'Ohangaron',
                                'Parkent', 'Piskent', 'Qibray', 'Qorasuv', 'Toshkent', 'Ulug\'nor',
                                'Xonobod', 'Zangiota', 'Andijon', 'Asaka', 'Bo\'ka', 'Bo\'z'
                            ];
                            
                            let bestDistrict = null;
                            let maxOccurrences = 0;
                            
                            for (const district of knownDistricts) {
                                // Use word boundary regex for precise matching
                                const regex = new RegExp(`\\b${district.replace(/'/g, "'")}\\b`, 'gi');
                                const matches = pageText.match(regex) || [];
                                const occurrences = matches.length;
                                console.log(`🔍 "${district}": ${occurrences} precise occurrences`);
                                
                                if (occurrences >= 2 && occurrences > maxOccurrences) {
                                    bestDistrict = district;
                                    maxOccurrences = occurrences;
                                }
                            }
                            
                            if (bestDistrict) {
                                detectedDistrict = bestDistrict;
                                detectionLog.push(`Precise matching: ${bestDistrict} (${maxOccurrences} times)`);
                                console.log('Precise matching found:', bestDistrict);
                            }
                        }
                        
                        console.log('🔍 DETECTION RESULTS:');
                        console.log('Detected district:', detectedDistrict);
                        console.log('Detection log:', detectionLog);
                        
                        if (!detectedDistrict) {
                            console.log('⚠️ No district detected. Consider manual input.');
                        }
                        
                        // Create period key with region name if detected
                        let periodKey = `${year}-${quarter}`;
                        if (detectedDistrict) {
                            // Check if this is a region (область)
                            const isRegion = detectedDistrict.includes('область') || 
                                           detectedDistrict.includes('обл.') ||
                                           detectedDistrict === 'Андижанская область';
                            
                            if (isRegion) {
                                // Use only first 3 characters of region name
                                let regionShort = detectedDistrict.substring(0, 3);
                                periodKey = `${regionShort}-${year}-${quarter}`;
                            }
                        }
                        
                        resolve({
                            data: dashboardData,
                            periodKey: periodKey,
                            detectedDistrict: detectedDistrict
                        });
                    }, 1000);
                });
            }
        });
        return result ? result.result : null;
    }

    async performDiagnosis() {
        let [tab] = await this.browserAPI.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('Нет активной вкладки');

        const [result] = await this.browserAPI.scripting.executeScript({
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

                const allText = document.body.innerText;
                const numberMatches = allText.match(/\b\d{2,6}(?:[,\s]\d{3})*(?:\.\d+)?\b/g) || [];
                const uniqueNumbers = [...new Set(numberMatches)].slice(0, 20);
                report.numbers = uniqueNumbers;

                return report;
            }
        });

        return result.result;
    }
}

// Make available globally
window.DataScraper = DataScraper;