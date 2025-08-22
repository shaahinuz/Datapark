// Main coordinator for IT Park Dashboard Helper Extension
// This file orchestrates all the modular components

// Initialize managers
let dataScraper, storageManager, comparisonEngine, exportManager, uiManager, notificationOverlay;
let comparisonResult = {};
let districtComparisonResult = {};

// Browser API compatibility
const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Extension popup loaded, DOM ready');
    try {
        // Initialize all managers
        dataScraper = new DataScraper();
        storageManager = new StorageManager();
        comparisonEngine = new ComparisonEngine();
        exportManager = new ExportManager();
        uiManager = new UIManager();
        notificationOverlay = new NotificationOverlay();
        
        // Make uiManager available globally for HTML event handlers
        window.uiManager = uiManager;

        setupEventListeners();
        uiManager.loadSavedPeriodsIntoDropdowns();
        uiManager.loadSavedDistrictsIntoDropdowns();
        console.log('Extension initialization complete');
    } catch (error) {
        console.error('Extension initialization error:', error);
    }
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const buttons = [
        { id: 'save-data-btn', handler: handleSaveData },
        { id: 'show-current-btn', handler: handleShowCurrentData },
        { id: 'compare-btn', handler: handleCompare },
        { id: 'generate-csv-btn', handler: handleGenerateCSV },
        { id: 'generate-docx-btn', handler: handleGenerateDOCX },
        { id: 'clear-cache-btn', handler: handleClearCache },
        { id: 'diagnose-btn', handler: handleDiagnose },
        { id: 'compare-districts-btn', handler: handleCompareDistricts },
        { id: 'generate-district-csv-btn', handler: handleGenerateDistrictCSV },
        { id: 'detect-district-btn', handler: handleDetectDistrict },
        { id: 'analyze-company-history-btn', handler: handleAnalyzeCompanyHistory },
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
                    uiManager.showStatus(`Ошибка: ${error.message}`, 'error');
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
            uiManager.loadFilteredDistrictsIntoDropdowns(selectedDistrict);
        });
        console.log('✓ District filter event listener added');
    }
    
    // Add event listener for period filter dropdown (regional viewer)
    const periodFilter = document.getElementById('period-filter-select');
    if (periodFilter) {
        periodFilter.addEventListener('change', (e) => {
            const selectedPeriod = e.target.value;
            handlePeriodFilterChange(selectedPeriod);
        });
        console.log('✓ Period filter event listener added');
    }
    
    // Add event listeners for save mode radio buttons
    const saveModeRadios = document.querySelectorAll('input[name="save-mode"]');
    saveModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const districtGroup = document.getElementById('district-input-group');
            if (e.target.value === 'district') {
                districtGroup.style.display = 'block';
            } else {
                districtGroup.style.display = 'none';
                // Clear any detected district info
                document.getElementById('detected-district-info').style.display = 'none';
                document.getElementById('district-name-input').value = '';
            }
        });
    });
}

// --- EVENT HANDLERS ---

async function handleShowCurrentData() {
    uiManager.showStatus('Считываю данные с экрана...', 'info');
    try {
        const pageData = await dataScraper.scrapeDashboardData();
        if (!pageData || !pageData.periodKey) {
            throw new Error("Не удалось определить период на странице.");
        }
        
        const { data } = pageData;
        console.log('📊 РЕЗУЛЬТАТЫ СКРАПИНГА:');
        console.log('- Резиденты:', data.totalResidents);
        console.log('- Сотрудники:', data.employeeCount);
        console.log('- Доход:', data.totalIncome);
        console.log('- Экспорт:', data.exportVolume);
        
        uiManager.displayCurrentData(pageData);
        
        const foundKPIs = [data.totalResidents, data.employeeCount, data.totalIncome, data.exportVolume].filter(x => x != null).length;
        const statusMsg = `Загружено: ${foundKPIs}/4 KPI, ${data.companies?.length || 0} компаний`;
        
        if (foundKPIs === 0 && (!data.companies || data.companies.length === 0)) {
            uiManager.showStatus(`${statusMsg} ⚠️ Данные не найдены! Проверьте консоль (F12)`, 'error');
        } else if (foundKPIs < 4 || !data.companies || data.companies.length === 0) {
            uiManager.showStatus(`${statusMsg} ⚠️ Неполные данные`, 'warning');
        } else {
            uiManager.showStatus(`${statusMsg} ✅`, 'success');
        }
    } catch (error) {
        console.error('Error showing current data:', error);
        uiManager.showStatus(`Ошибка: ${error.message}`, 'error');
    }
}

async function handleSaveData() {
    uiManager.showStatus('Считываю данные с экрана...', 'info');
    
    // Check save mode
    const saveMode = document.querySelector('input[name="save-mode"]:checked').value;
    let districtName = '';
    
    if (saveMode === 'district') {
        const districtInput = document.getElementById('district-name-input');
        districtName = districtInput.value.trim();
    }
    
    // Show saving notification
    const savingNotificationId = notificationOverlay.showSaving(districtName);
    
    try {
        const pageData = await dataScraper.scrapeDashboardData();
        
        if (saveMode === 'district') {
            // If no district name provided, try to use detected one
            if (!districtName && pageData.detectedDistrict) {
                districtName = pageData.detectedDistrict;
                document.getElementById('district-name-input').value = districtName;
            }
            
            if (!districtName) {
                notificationOverlay.hide(savingNotificationId);
                notificationOverlay.showError('Пожалуйста, укажите название района или нажмите "Определить"');
                uiManager.showStatus('Пожалуйста, укажите название района или нажмите "Определить"', 'error');
                return;
            }
        }
        
        const displayName = await storageManager.saveData(pageData, districtName);
        
        // Hide saving notification and show success
        notificationOverlay.hide(savingNotificationId);
        notificationOverlay.showSaved(districtName, pageData.periodKey);
        
        uiManager.showStatus(`Данные за ${displayName} успешно сохранены!`, 'success');
        await uiManager.loadSavedPeriodsIntoDropdowns();
        await uiManager.loadSavedDistrictsIntoDropdowns();
    } catch (error) {
        console.error('Error saving data:', error);
        notificationOverlay.hide(savingNotificationId);
        notificationOverlay.showError(`Ошибка сохранения: ${error.message}`);
        uiManager.showStatus(`Ошибка сохранения: ${error.message}`, 'error');
    }
}

async function handleClearCache() {
    if (!confirm('Вы уверены, что хотите очистить весь кэш? Это удалит все сохраненные данные и сравнения.')) {
        return;
    }
    
    try {
        uiManager.showStatus('Очищаю кэш...', 'info');
        
        const removedCount = await storageManager.clearAllData();
        
        if (removedCount === 0) {
            uiManager.showStatus('Кэш уже пуст.', 'info');
            return;
        }
        
        // Clear global variables
        comparisonResult = {};
        districtComparisonResult = {};
        
        // Clear UI
        uiManager.clearUI();
        
        // Reload dropdowns
        await uiManager.loadSavedPeriodsIntoDropdowns();
        await uiManager.loadSavedDistrictsIntoDropdowns();
        
        uiManager.showStatus(`Кэш очищен! Удалено ${removedCount} записей.`, 'success');
        
    } catch (error) {
        console.error('Error clearing cache:', error);
        uiManager.showStatus(`Ошибка очистки кэша: ${error.message}`, 'error');
    }
}

async function handleDiagnose() {
    uiManager.showStatus('Анализирую структуру страницы...', 'info');
    
    try {
        const report = await dataScraper.performDiagnosis();
        console.log('🔍 ДИАГНОСТИКА СТРАНИЦЫ:', report);
        
        uiManager.displayDiagnosisReport(report);
        uiManager.showStatus('Диагностика завершена. Смотрите результаты ниже.', 'success');
        
    } catch (error) {
        console.error('Diagnosis error:', error);
        uiManager.showStatus(`Ошибка диагностики: ${error.message}`, 'error');
    }
}

async function handleCompare() {
    const key1 = document.getElementById('period1-select').value;
    const key2 = document.getElementById('period2-select').value;

    if (!key1 || !key2) {
        uiManager.showStatus('Пожалуйста, выберите два периода для сравнения.', 'error');
        return;
    }
    
    uiManager.showStatus('Сравниваю данные...', 'info');
    try {
        const storedData = await storageManager.getData([key1, key2]);
        const data1 = storedData[key1];
        const data2 = storedData[key2];

        if (!data1 || !data2) {
            throw new Error("Не удалось загрузить данные для одного из периодов.");
        }
        
        comparisonResult = comparisonEngine.createPeriodComparison(
            data1, data2, 
            key1.replace('period_', ''), 
            key2.replace('period_', '')
        );
        
        uiManager.displayComparison(comparisonResult);
        uiManager.showStatus('Сравнение готово.', 'success');
    } catch (error) {
        console.error('Error comparing data:', error);
        uiManager.showStatus(`Ошибка сравнения: ${error.message}`, 'error');
    }
}

async function handleCompareDistricts() {
    const key1 = document.getElementById('district1-select').value;
    const key2 = document.getElementById('district2-select').value;

    if (!key1 || !key2) {
        uiManager.showStatus('Пожалуйста, выберите два района для сравнения.', 'error');
        return;
    }
    
    uiManager.showStatus('Сравниваю данные районов...', 'info');
    try {
        const storedData = await storageManager.getData([key1, key2]);
        const data1 = storedData[key1];
        const data2 = storedData[key2];

        if (!data1 || !data2) {
            throw new Error("Не удалось загрузить данные для одного из районов.");
        }
        
        districtComparisonResult = comparisonEngine.createDistrictComparison(
            data1, data2,
            key1.replace('district_', ''),
            key2.replace('district_', '')
        );
        
        uiManager.displayDistrictComparison(districtComparisonResult);
        uiManager.showStatus('Сравнение районов готово.', 'success');
    } catch (error) {
        console.error('Error comparing districts:', error);
        uiManager.showStatus(`Ошибка сравнения районов: ${error.message}`, 'error');
    }
}

async function handleGenerateCSV() {
    if (!comparisonResult.period1) {
        uiManager.showStatus('Сначала сравните данные.', 'error');
        return;
    }
    
    uiManager.showStatus('Генерирую CSV отчет...', 'info');
    
    try {
        const csvContent = await exportManager.generatePeriodTemplateCSV(comparisonResult);
        exportManager.downloadCSV(csvContent, `regions_comparison_${comparisonResult.period1.key}_vs_${comparisonResult.period2.key}.csv`);
        
        uiManager.showStatus('CSV файл успешно сгенерирован!', 'success');
    } catch (error) {
        console.error('Error generating CSV:', error);
        uiManager.showStatus(`Ошибка генерации CSV: ${error.message}`, 'error');
    }
}

async function handleGenerateDOCX() {
    if (!comparisonResult.period1) {
        uiManager.showStatus('Сначала сравните данные.', 'error');
        return;
    }
    
    uiManager.showStatus('Генерирую DOCX отчет...', 'info');
    
    try {
        const docxContent = await exportManager.generateUzbekReportDOCX(comparisonResult);
        exportManager.downloadWordDocument(docxContent, `IT_report_${comparisonResult.period1.key}_vs_${comparisonResult.period2.key}.doc`);
        uiManager.showStatus('Word документ успешно сгенерирован!', 'success');
    } catch (error) {
        console.error('Error generating DOCX:', error);
        uiManager.showStatus(`Ошибка генерации DOCX: ${error.message}`, 'error');
    }
}

async function handleGenerateDistrictCSV() {
    if (!districtComparisonResult.period1) {
        uiManager.showStatus('Сначала сравните районы.', 'error');
        return;
    }
    
    uiManager.showStatus('Генерирую CSV отчет по районам...', 'info');
    
    try {
        const csvContent = await exportManager.generateDistrictTemplateCSV(districtComparisonResult);
        
        const districtName = exportManager.extractDistrictName(districtComparisonResult.period1.key);
        const filename = `comparison_${districtName}_${exportManager.extractPeriod(districtComparisonResult.period1.key)}_vs_${exportManager.extractPeriod(districtComparisonResult.period2.key)}.csv`;
        
        exportManager.downloadCSV(csvContent, filename);
        uiManager.showStatus('CSV файл успешно сгенерирован!', 'success');
    } catch (error) {
        console.error('Error generating district CSV:', error);
        uiManager.showStatus(`Ошибка генерации CSV: ${error.message}`, 'error');
    }
}

async function handleDetectDistrict() {
    uiManager.showStatus('Определяю район...', 'info');
    try {
        const pageData = await dataScraper.scrapeDashboardData();
        
        if (pageData.detectedDistrict) {
            // Show detected district
            document.getElementById('detected-district-name').textContent = pageData.detectedDistrict;
            document.getElementById('detected-district-info').style.display = 'block';
            
            // Fill in the input
            document.getElementById('district-name-input').value = pageData.detectedDistrict;
            
            // Show notification
            notificationOverlay.showDetected(pageData.detectedDistrict);
            uiManager.showStatus(`Район "${pageData.detectedDistrict}" определен автоматически!`, 'success');
        } else {
            document.getElementById('detected-district-info').style.display = 'none';
            
            // Show notification and helpful debug info
            notificationOverlay.showDetectionFailed();
            uiManager.showStatus('Район не определен. Смотрите консоль (F12) для отладки или введите вручную.', 'warning');
            
            // Log helpful information for debugging
            console.log('🔧 ПОМОЩЬ ПО ОПРЕДЕЛЕНИЮ РАЙОНА:');
            console.log('1. Откройте консоль браузера (F12)');
            console.log('2. Найдите в логах "🔍 DISTRICT DETECTION DEBUG"');
            console.log('3. Проверьте, содержит ли страница селекторы районов');
            console.log('4. Убедитесь, что вы находитесь на странице конкретного района');
            console.log('5. Если ничего не помогает, введите название района вручную');
        }
    } catch (error) {
        console.error('Error detecting district:', error);
        notificationOverlay.showError(`Ошибка определения района: ${error.message}`);
        uiManager.showStatus(`Ошибка определения района: ${error.message}`, 'error');
    }
}

let companyHistoryResult = {};

async function handleAnalyzeCompanyHistory() {
    uiManager.showStatus('Анализирую историю компаний...', 'info');
    
    try {
        const allData = await storageManager.getAllData();
        console.log('All stored data:', allData);
        
        const periodKeys = Object.keys(allData).filter(key => key.startsWith('period_'));
        console.log('Found period keys:', periodKeys);
        
        if (periodKeys.length === 0) {
            uiManager.showStatus('Нет сохраненных периодов. Сначала сохраните данные с дашборда.', 'error');
            return;
        }
        
        if (periodKeys.length < 2) {
            uiManager.showStatus('Недостаточно данных для полного анализа. Рекомендуется минимум 2 периода, но покажем доступные данные.', 'warning');
        }
        
        const periodsData = {};
        let totalCompanies = 0;
        
        periodKeys.forEach(key => {
            periodsData[key] = allData[key];
            const companies = allData[key]?.companies || [];
            totalCompanies += companies.length;
        });
        
        console.log(`Total companies across all periods: ${totalCompanies}`);
        
        if (totalCompanies === 0) {
            uiManager.showStatus('В сохраненных периодах нет данных о компаниях. Убедитесь, что данные сохранены корректно.', 'error');
            return;
        }
        
        const historyData = comparisonEngine.analyzeCompanyHistory(periodsData);
        const stats = comparisonEngine.getCompanyStatistics(periodsData);
        
        console.log('History data generated:', historyData);
        console.log('Stats generated:', stats);
        
        companyHistoryResult = {
            historyData,
            stats,
            periodsData
        };
        
        uiManager.displayCompanyHistory({ periodsData, historyData, stats });
        uiManager.showStatus(`История по ${periodKeys.length} периодам проанализирована! Найдено ${totalCompanies} записей компаний.`, 'success');
        
    } catch (error) {
        console.error('Error analyzing company history:', error);
        uiManager.showStatus(`Ошибка анализа истории: ${error.message}`, 'error');
    }
}

async function handlePeriodFilterChange(selectedPeriod) {
    if (!selectedPeriod) {
        document.getElementById('regional-data-display').style.display = 'none';
        return;
    }
    
    try {
        const allData = await storageManager.getAllData();
        
        // Extract the base period (e.g., "2025-2Q" from "Анд-2025-2Q")
        const basePeriod = selectedPeriod.includes('-') ? 
            selectedPeriod.split('-').slice(-2).join('-') : selectedPeriod;
        
        // Find all regions that have data for this period
        const regionalData = [];
        Object.keys(allData).forEach(key => {
            if (key.startsWith('period_') && key.includes(basePeriod)) {
                const data = allData[key];
                const regionName = key.replace('period_', '');
                
                // Extract region from period key if it contains region info
                let displayName = regionName;
                if (regionName.includes('-') && regionName !== basePeriod) {
                    const parts = regionName.split('-');
                    if (parts.length >= 3) {
                        displayName = `${parts[0]} (${parts.slice(1).join('-')})`;
                    }
                }
                
                regionalData.push({
                    regionName: displayName,
                    data: data,
                    employees: data.employeeCount || 0,
                    companies: data.companies ? data.companies.length : 0
                });
            }
        });
        
        uiManager.displayRegionalData(regionalData, basePeriod);
        
    } catch (error) {
        console.error('Error loading regional data:', error);
        uiManager.showStatus(`Ошибка загрузки региональных данных: ${error.message}`, 'error');
    }
}


