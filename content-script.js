// Simple floating buttons for IT Park Dashboard Helper Extension
console.log('🚀 Datapark content script loaded on:', window.location.href);

// Check Chrome extension APIs availability
if (typeof chrome === 'undefined') {
    console.error('❌ Chrome extension APIs not available');
} else {
    console.log('✅ Chrome extension APIs available');
}

// Check if we're on an IT Park domain
if (window.location.hostname.includes('it-park.uz')) {
    console.log('✅ On IT Park domain, initializing floating buttons...');
    
    let detectedDistrictName = null;
    
    // Create floating buttons container
    const createFloatingButtons = () => {
        // Check if already exists
        if (document.getElementById('datapark-floating-buttons')) {
            console.log('⚠️ Floating buttons already exist, skipping creation');
            return;
        }
        
        console.log('✨ Creating new floating buttons...');
        
        // Create container
        const container = document.createElement('div');
        container.id = 'datapark-floating-buttons';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            pointer-events: auto;
        `;
        
        // Create detect button
        const detectBtn = document.createElement('button');
        detectBtn.id = 'datapark-detect';
        detectBtn.textContent = '🔍 Найти данные';
        detectBtn.title = 'Определить текущий район/регион';
        detectBtn.style.cssText = `
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 18px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-width: 120px;
            text-align: center;
        `;
        
        // Create save button
        const saveBtn = document.createElement('button');
        saveBtn.id = 'datapark-save';
        saveBtn.textContent = '💾 Сохранить';
        saveBtn.title = 'Сохранить данные района/региона';
        saveBtn.disabled = true;
        saveBtn.style.cssText = `
            background: #9E9E9E;
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 18px;
            font-size: 13px;
            font-weight: 600;
            cursor: not-allowed;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-width: 120px;
            text-align: center;
        `;
        
        // Add hover effects
        [detectBtn, saveBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            });
        });
        
        container.appendChild(detectBtn);
        container.appendChild(saveBtn);
        
        // Add to page
        document.body.appendChild(container);
        
        // Add event listeners
        detectBtn.addEventListener('click', handleDetectDistrict);
        saveBtn.addEventListener('click', handleSaveDistrict);
        
        console.log('✅ Floating buttons created successfully');
    };
    
    // Handle detect district/region - using exact same logic as main extension
    const handleDetectDistrict = async () => {
        try {
            showNotification('Определяю данные...', 'info');
            
            // Use exact same scraping logic as main extension
            const pageData = await scrapeDashboardData();
            
            if (pageData.detectedDistrict) {
                detectedDistrictName = pageData.detectedDistrict;
                
                // Check if this is a region (область) - should be saved as general data
                const isRegion = detectedDistrictName.includes('область') || 
                               detectedDistrictName.includes('область') ||
                               detectedDistrictName === 'Андижанская область';
                
                // Update save button state
                const saveBtn = document.getElementById('datapark-save');
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.style.background = '#4CAF50';
                    saveBtn.style.cursor = 'pointer';
                    
                    if (isRegion) {
                        saveBtn.textContent = `💾 Сохранить регион`;
                        showNotification(`Регион найден: "${detectedDistrictName}" ✅\nБудет сохранен как общие данные для сравнения периодов!`, 'success');
                    } else {
                        saveBtn.textContent = `💾 Сохранить ${detectedDistrictName}`;
                        showNotification(`Район найден: "${detectedDistrictName}" ✅\nТеперь можно сохранить данные района!`, 'success');
                    }
                }
            } else {
                detectedDistrictName = null;
                showNotification('Данные не определены\n\nПроверьте:\n• Находитесь ли вы на странице конкретного района/региона\n• Выбран ли район в фильтрах\n• Есть ли название в заголовке страницы', 'warning');
            }
        } catch (error) {
            console.error('❌ Detection error:', error);
            showNotification(`Ошибка определения: ${error.message}`, 'error');
        }
    };
    
    // Handle save district/region - using exact same logic as main extension
    const handleSaveDistrict = async () => {
        if (!detectedDistrictName) {
            showNotification('Сначала определите данные кнопкой "🔍 Найти данные"', 'error');
            return;
        }
        
        try {
            // Check if this is a region (область) - should be saved as general data
            const isRegion = detectedDistrictName.includes('область') || 
                           detectedDistrictName.includes('область') ||
                           detectedDistrictName === 'Андижанская область';
            
            if (isRegion) {
                showNotification(`Сохраняю общие данные региона...`, 'info');
            } else {
                showNotification(`Сохраняю данные района ${detectedDistrictName}...`, 'info');
            }
            
            // Use exact same scraping logic as main extension
            const pageData = await scrapeDashboardData();
            
            if (!pageData || !pageData.periodKey) {
                throw new Error("Не удалось определить период на странице");
            }
            
            let key, successMessage;
            
            if (isRegion) {
                // Save as general period data (like main extension period comparison)
                key = `period_${pageData.periodKey}`;
                successMessage = `Регион "${detectedDistrictName}" (${pageData.periodKey}) сохранен как общие данные! 📊\n\nДоступно для сравнения периодов в основном расширении.`;
            } else {
                // Save as district data using exact same key format as main extension
                key = `district_${detectedDistrictName}_${pageData.periodKey}`;
                successMessage = `Район "${detectedDistrictName}" (${pageData.periodKey}) сохранен! 🏘️\n\nДоступно для сравнения районов в основном расширении.`;
            }
            
            // Try message passing first, fallback to direct storage
            if (chrome?.runtime?.sendMessage) {
                try {
                    const response = await chrome.runtime.sendMessage({
                        type: 'save-data',
                        data: {
                            key: key,
                            value: pageData.data
                        }
                    });
                    
                    if (response && response.success) {
                        showNotification(successMessage, 'success');
                    } else {
                        throw new Error(response?.error || 'Failed to save data via message passing');
                    }
                } catch (messageError) {
                    console.warn('Message passing failed, using direct storage:', messageError);
                    // Fallback to direct storage
                    await chrome.storage.local.set({
                        [key]: pageData.data
                    });
                    showNotification(successMessage, 'success');
                }
            } else {
                // Direct storage access if chrome.runtime not available
                if (chrome?.storage?.local) {
                    await chrome.storage.local.set({
                        [key]: pageData.data
                    });
                    showNotification(successMessage, 'success');
                } else {
                    throw new Error('Chrome extension APIs not available');
                }
            }
            
            // Reset button state
            const saveBtn = document.getElementById('datapark-save');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.style.background = '#9E9E9E';
                saveBtn.style.cursor = 'not-allowed';
                saveBtn.textContent = '💾 Сохранить';
            }
            detectedDistrictName = null;
            
        } catch (error) {
            console.error('❌ Save error:', error);
            showNotification(`Ошибка сохранения: ${error.message}`, 'error');
        }
    };
    
    // Scrape dashboard data - EXACT SAME LOGIC as data-scraper.js
    const scrapeDashboardData = () => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const dashboardData = {
                    totalResidents: null, employeeCount: null,
                    totalIncome: null, exportVolume: null,
                    companies: [],
                    directions: []
                };

                // Scrape main KPIs
                const allTitles = document.querySelectorAll('.staticBlockTitle');
                
                allTitles.forEach((titleElement) => {
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
                        }
                    }
                });
                
                // Scrape company table
                const tableRows = document.querySelectorAll('.table-x tbody tr, table tbody tr');
                tableRows.forEach((row) => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 9) {
                        const companyName = cells[2]?.innerText.trim();
                        const direction = cells[7]?.innerText.trim();
                        const totalEmployees = parseInt(cells[8]?.innerText.trim(), 10);
                        
                        if (companyName && !isNaN(totalEmployees)) {
                            dashboardData.companies.push({ 
                                name: companyName, 
                                employees: totalEmployees, 
                                direction: direction 
                            });
                        }
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
                
                // EXACT SAME district detection logic as data-scraper.js
                let detectedDistrict = null;
                const detectionLog = [];
                
                
                // Method 1: Check URL for district parameter  
                const urlParams = new URLSearchParams(window.location.search);
                const districtParam = urlParams.get('district') || urlParams.get('rayon') || urlParams.get('tuman') || urlParams.get('region') || urlParams.get('soato_name');
                if (districtParam && districtParam !== 'all' && districtParam !== 'null' && districtParam !== '') {
                    detectedDistrict = districtParam;
                    detectionLog.push(`URL param: ${districtParam}`);
                }
                
                // Method 2: Look for district/rayon selector
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
                    const textSelectors = [
                        'h1', 'h2', 'h3', '.page-title', '.section-title', 
                        '.district-name', '.location-info', '.breadcrumb'
                    ];
                    
                    for (const selector of textSelectors) {
                        const elements = document.querySelectorAll(selector);
                        for (const element of elements) {
                            const text = element.innerText || '';
                            
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
                
                // Method 4: Precise district name matching
                if (!detectedDistrict) {
                    console.log('Method 4: Precise district matching...');
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
            }, 500);
        });
    };
    
    // Show notification on page
    const showNotification = (message, type = 'info') => {
        // Remove existing notification
        const existing = document.getElementById('datapark-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.id = 'datapark-notification';
        
        const colors = {
            info: { bg: '#2196F3', text: 'white' },
            success: { bg: '#4CAF50', text: 'white' },
            error: { bg: '#F44336', text: 'white' },
            warning: { bg: '#FF9800', text: 'white' }
        };
        
        const color = colors[type] || colors.info;
        
        notification.style.cssText = `
            position: fixed;
            bottom: 180px;
            right: 20px;
            background: ${color.bg};
            color: ${color.text};
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            white-space: pre-line;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 4000);
        
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    };
    
    // Initialize when DOM is ready
    const initializeButtons = () => {
        if (document.body) {
            createFloatingButtons();
        } else {
            setTimeout(initializeButtons, 100);
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeButtons);
    } else {
        initializeButtons();
    }
    
} else {
    console.log('ℹ️ Not on IT Park domain, content script inactive');
}