// Main coordinator for IT Park Dashboard Helper Extension
// This file orchestrates all the modular components

// Initialize managers
let dataScraper, storageManager, comparisonEngine, exportManager, uiManager, notificationOverlay;
let comparisonResult = {};
let districtComparisonResult = {};

// Browser API compatibility
const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

// Cache frequently used DOM elements
const domCache = {
    elements: {},
    get(id) {
        if (!this.elements[id]) {
            this.elements[id] = document.getElementById(id);
        }
        return this.elements[id];
    },
    clear() {
        this.elements = {};
    }
};

// Utility function for debouncing user input
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Utility functions for loading skeletons
const skeletonUtils = {
    // Show table skeleton with specified number of rows
    showTableSkeleton(containerId, rows = 5) {
        const container = domCache.get(containerId);
        if (!container) return;
        
        let skeletonHTML = '<div class="skeleton-table">';
        skeletonHTML += '<div class="skeleton skeleton-header"></div>';
        for(let i = 0; i < rows; i++) {
            skeletonHTML += '<div class="skeleton skeleton-row"></div>';
        }
        skeletonHTML += '</div>';
        container.innerHTML = skeletonHTML;
    },
    
    // Show text skeleton for loading states
    showTextSkeleton(containerId, lines = 3) {
        const container = domCache.get(containerId);
        if (!container) return;
        
        let skeletonHTML = '<div class="skeleton-text-container">';
        for(let i = 0; i < lines; i++) {
            const sizeClass = i % 3 === 0 ? 'long' : i % 3 === 1 ? 'medium' : 'short';
            skeletonHTML += `<div class="skeleton skeleton-text ${sizeClass}"></div>`;
        }
        skeletonHTML += '</div>';
        container.innerHTML = skeletonHTML;
    },
    
    // Clear skeleton and restore content
    clearSkeleton(containerId) {
        const container = domCache.get(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }
};

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
        
        // Initialize theme
        initializeTheme();
        
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
        { id: 'multi-compare-btn', handler: handleMultiCompare },
        { id: 'add-period-btn', handler: handleAddPeriod },
        { id: 'multi-period-compare-btn', handler: handleMultiPeriodCompare },
        { id: 'multi-period-export-btn', handler: handleMultiPeriodExport },
        { id: 'generate-csv-btn', handler: handleGenerateCSV },
        { id: 'generate-docx-btn', handler: handleGenerateDOCX },
        { id: 'clear-cache-btn', handler: handleClearCache },
        { id: 'diagnose-btn', handler: handleDiagnose },
        { id: 'compare-districts-btn', handler: handleCompareDistricts },
        { id: 'generate-district-csv-btn', handler: handleGenerateDistrictCSV },
        { id: 'detect-district-btn', handler: handleDetectDistrict },
        { id: 'analyze-company-history-btn', handler: handleAnalyzeCompanyHistory },
        { id: 'regional-viewer-btn', handler: handleRegionalViewer },
        { id: 'show-regional-btn', handler: handleShowRegionalData },
        { id: 'theme-toggle', handler: handleThemeToggle },
        { id: 'export-all-data-btn', handler: handleExportAllData },
        { id: 'import-all-data-btn', handler: handleImportAllData },
        { id: 'manage-startups-btn', handler: handleManageStartups },
        { id: 'manage-startups-comparison-btn', handler: handleManageStartupsComparison },
        { id: 'add-startups-btn', handler: handleAddStartups },
        { id: 'show-startups-btn', handler: handleShowStartups },
        { id: 'save-startups-btn', handler: handleSaveStartups },
        { id: 'cancel-startups-btn', handler: handleCancelStartups },
    ];
    
    buttons.forEach(({ id, handler }) => {
        const element = domCache.get(id);
        if (element) {
            element.addEventListener('click', (e) => {
                console.log(`Button clicked: ${id}`);
                try {
                    handler();
                } catch (error) {
                    console.error(`Error in ${id} handler:`, error);
                    uiManager.showStatus(`Ошибка выполнения операции: ${error.message}`, 'error');
                }
            });
            console.log(`✓ Event listener added for ${id}`);
        } else {
            console.warn(`✗ Button not found: ${id}`);
        }
    });
    
    // Add event listener for district filter dropdown with debouncing
    const districtFilter = domCache.get('district-filter-select');
    if (districtFilter) {
        // Create debounced version of the filter function
        const debouncedDistrictFilter = debounce((selectedDistrict) => {
            uiManager.loadFilteredDistrictsIntoDropdowns(selectedDistrict);
        }, 300); // Wait 300ms after user stops selecting
        
        districtFilter.addEventListener('change', (e) => {
            const selectedDistrict = e.target.value;
            debouncedDistrictFilter(selectedDistrict);
        });
        console.log('✓ District filter event listener added (with debouncing)');
    }
    
    // Add event listener for period filter dropdown (regional viewer)
    const periodFilter = domCache.get('period-filter-select');
    if (periodFilter) {
        periodFilter.addEventListener('change', (e) => {
            const selectedPeriod = e.target.value;
            const showBtn = domCache.get('show-regional-btn');
            if (showBtn) {
                showBtn.disabled = !selectedPeriod;
                const iconSpan = showBtn.querySelector('.icon');
                const buttonText = selectedPeriod ? 'Показать регионы' : 'Выберите период';
                showBtn.innerHTML = iconSpan ? 
                    `${iconSpan.outerHTML} ${buttonText}` : 
                    buttonText;
            }
        });
        console.log('✓ Period filter event listener added');
    }
    
    // Add event listeners for save mode radio buttons
    const saveModeRadios = document.querySelectorAll('input[name="save-mode"]');
    saveModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const districtGroup = domCache.get('district-input-group');
            const detectedInfo = domCache.get('detected-district-info');
            const districtInput = domCache.get('district-name-input');
            
            if (e.target.value === 'district') {
                districtGroup.classList.remove('hidden');
                districtGroup.classList.add('visible');
            } else {
                districtGroup.classList.add('hidden');
                detectedInfo.classList.add('hidden');
                districtInput.value = '';
            }
        });
    });
    
    // Add event listener for file import
    const importFileInput = domCache.get('import-file-input');
    if (importFileInput) {
        importFileInput.addEventListener('change', handleFileImport);
        console.log('✓ File import event listener added');
    }
    
    // Add event listener for startup period select
    const startupPeriodSelect = domCache.get('startup-period-select');
    if (startupPeriodSelect) {
        startupPeriodSelect.addEventListener('change', async (e) => {
            const selectedPeriod = e.target.value;
            const addBtn = domCache.get('add-startups-btn');
            const showBtn = domCache.get('show-startups-btn');
            
            // Save the selected period for persistence
            lastSelectedStartupPeriod = selectedPeriod;
            
            if (addBtn && showBtn) {
                addBtn.disabled = !selectedPeriod;
                showBtn.disabled = !selectedPeriod;
            }
            
            // Auto-show startups when period changes (if there are any)
            if (selectedPeriod) {
                try {
                    // Get period data to check for available companies
                    const periodData = await storageManager.getData([selectedPeriod]);
                    const data = periodData[selectedPeriod];
                    
                    if (data && data.companies && data.companies.length > 0) {
                        let startups = await storageManager.getStartupCompaniesForPeriod(selectedPeriod, data.companies);
                        
                        // TEMPORARY FIX: Refresh startup employee data with current period data
                        startups = startups.map(startup => {
                            const matchingCompany = data.companies.find(company => 
                                company.name === startup.name && (company.region || '') === (startup.region || '')
                            );
                            
                            if (matchingCompany && matchingCompany.employees) {
                                return {
                                    ...startup,
                                    employeeCount: matchingCompany.employees,
                                    employees: matchingCompany.employees
                                };
                            }
                            
                            return startup;
                        });
                        
                        if (startups.length > 0) {
                            displayStartupCompanies(startups, selectedPeriod);
                        } else {
                            // Hide the display section if no startups
                            const displaySection = domCache.get('startup-display-section');
                            displaySection.classList.add('hidden');
                        }
                    } else {
                        // Hide the display section if no companies
                        const displaySection = domCache.get('startup-display-section');
                        displaySection.classList.add('hidden');
                    }
                } catch (error) {
                    console.error('Error loading startups on period change:', error);
                }
            }
        });
        console.log('✓ Startup period select event listener added');
    }
    
    // Add event delegation for dynamically created startup CSV export buttons
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'export-startup-csv-btn') {
            e.preventDefault();
            console.log('Startup CSV export button clicked');
            
            try {
                if (window.currentStartupData) {
                    const { startups, periodName } = window.currentStartupData;
                    
                    uiManager.showStatus('Генерирую CSV файл стартапов...', 'info');
                    const csvContent = generateStartupCSV(startups, periodName);
                    const filename = `startups-${periodName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
                    downloadCSV(csvContent, filename);
                    
                    uiManager.showStatus(`CSV файл стартапов успешно экспортирован: ${filename}`, 'success');
                } else {
                    uiManager.showStatus('Данные стартапов не найдены для экспорта', 'error');
                }
            } catch (error) {
                console.error('Error exporting startup CSV:', error);
                uiManager.showStatus(`Ошибка экспорта CSV: ${error.message}`, 'error');
            }
        }
    });
    console.log('✓ Event delegation for startup CSV export added');
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
        uiManager.showStatus(`Ошибка загрузки данных: ${error.message}`, 'error');
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
        uiManager.showStatus(`Ошибка сохранения данных: ${error.message}`, 'error');
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
        uiManager.showStatus(`Ошибка очистки данных: ${error.message}`, 'error');
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
        uiManager.showStatus(`Ошибка диагностики страницы: ${error.message}`, 'error');
    }
}

async function handleCompare() {
    const key1 = domCache.get('period1-select').value;
    const key2 = domCache.get('period2-select').value;

    if (!key1 || !key2) {
        uiManager.showStatus('Пожалуйста, выберите два периода для сравнения.', 'error');
        return;
    }
    
    // Show loading skeleton for comparison results
    const comparisonSection = domCache.get('comparison-section');
    comparisonSection.classList.remove('hidden');
    comparisonSection.classList.add('fade-in');
    skeletonUtils.showTableSkeleton('comparison-data', 6);
    skeletonUtils.showTextSkeleton('company-comparison-section', 4);
    
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
        uiManager.showStatus(`Ошибка сравнения периодов: ${error.message}`, 'error');
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

async function handleShowRegionalData() {
    const periodFilter = domCache.get('period-filter-select');
    const selectedPeriod = periodFilter ? periodFilter.value : '';
    
    if (!selectedPeriod) {
        uiManager.showStatus('Выберите период для отображения', 'error');
        return;
    }
    
    await handlePeriodFilterChange(selectedPeriod);
}

async function handlePeriodFilterChange(selectedPeriod) {
    const regionalDisplay = domCache.get('regional-data-display');
    
    if (!selectedPeriod) {
        regionalDisplay.classList.add('hidden');
        return;
    }
    
    // Show loading skeleton immediately
    regionalDisplay.classList.remove('hidden');
    regionalDisplay.classList.add('fade-in');
    skeletonUtils.showTableSkeleton('regional-data-display', 4);
    
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

// Multi-period comparison functionality
let multiPeriodData = [];
let selectedPeriods = [];

function handleMultiCompare() {
    console.log('Multi-period comparison button clicked');
    
    // Hide other sections and show multi-period section
    domCache.get('comparison-section').classList.add('hidden');
    domCache.get('regional-viewer-section').classList.add('hidden');
    domCache.get('multi-period-section').classList.remove('hidden');
    
    // Initialize with two period selectors
    initializeMultiPeriodSelectors();
}

function handleRegionalViewer() {
    console.log('Regional viewer button clicked');
    
    // Hide other sections and show regional viewer section
    domCache.get('comparison-section').classList.add('hidden');
    domCache.get('multi-period-section').classList.add('hidden');
    domCache.get('regional-viewer-section').classList.remove('hidden');
}

function initializeMultiPeriodSelectors() {
    selectedPeriods = [];
    const container = domCache.get('multi-period-selectors');
    container.innerHTML = '';
    
    // Add initial one selector
    addPeriodSelector();
    
    updateMultiPeriodCompareButton();
}

function addPeriodSelector() {
    const container = domCache.get('multi-period-selectors');
    const selectorIndex = selectedPeriods.length;
    
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'multi-period-selector';
    selectorDiv.dataset.index = selectorIndex;
    
    const label = document.createElement('label');
    label.textContent = `Период ${selectorIndex + 1}:`;
    label.style.minWidth = '80px';
    
    const select = document.createElement('select');
    select.id = `multi-period-select-${selectorIndex}`;
    select.addEventListener('change', (e) => {
        selectedPeriods[selectorIndex] = e.target.value;
        updateMultiPeriodCompareButton();
    });
    
    // Add remove button (only if more than 2 selectors)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-period-btn';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Удалить период';
    removeBtn.addEventListener('click', () => removePeriodSelector(selectorIndex));
    
    selectorDiv.appendChild(label);
    selectorDiv.appendChild(select);
    
    // Add the period first, then check if we should show remove button
    selectedPeriods.push('');
    
    if (selectedPeriods.length > 2) {
        selectorDiv.appendChild(removeBtn);
    }
    
    container.appendChild(selectorDiv);
    
    // Populate the select with saved periods
    loadPeriodsIntoMultiSelect(select);
}

async function loadPeriodsIntoMultiSelect(selectElement) {
    const periodKeys = await storageManager.getSavedPeriods();
    selectElement.innerHTML = '<option value="">Выберите период...</option>';
    
    periodKeys.forEach(key => {
        const displayName = key.replace('period_', '');
        const option = document.createElement('option');
        option.value = key;
        option.textContent = displayName;
        selectElement.appendChild(option);
    });
}

function removePeriodSelector(indexToRemove) {
    const container = domCache.get('multi-period-selectors');
    const selectors = container.querySelectorAll('.multi-period-selector');
    
    if (selectors.length <= 2) return; // Keep minimum 2 selectors
    
    // Remove the selector
    const selectorToRemove = container.querySelector(`[data-index="${indexToRemove}"]`);
    if (selectorToRemove) {
        selectorToRemove.remove();
    }
    
    // Update selectedPeriods array
    selectedPeriods.splice(indexToRemove, 1);
    
    // Re-index remaining selectors
    const remainingSelectors = container.querySelectorAll('.multi-period-selector');
    remainingSelectors.forEach((selector, newIndex) => {
        selector.dataset.index = newIndex;
        const label = selector.querySelector('label');
        const select = selector.querySelector('select');
        const removeBtn = selector.querySelector('.remove-period-btn');
        
        label.textContent = `Период ${newIndex + 1}:`;
        select.id = `multi-period-select-${newIndex}`;
        
        // Update event listener
        select.removeEventListener('change', select._changeHandler);
        select._changeHandler = (e) => {
            selectedPeriods[newIndex] = e.target.value;
            updateMultiPeriodCompareButton();
        };
        select.addEventListener('change', select._changeHandler);
        
        // Hide/show remove button
        if (remainingSelectors.length <= 2) {
            if (removeBtn) removeBtn.style.display = 'none';
        } else {
            if (removeBtn) removeBtn.style.display = 'block';
        }
    });
    
    updateMultiPeriodCompareButton();
}

function handleAddPeriod() {
    addPeriodSelector();
    updateMultiPeriodCompareButton();
}

function updateMultiPeriodCompareButton() {
    const compareBtn = domCache.get('multi-period-compare-btn');
    const validSelections = selectedPeriods.filter(period => period !== '').length;
    
    console.log('Updating multi-period compare button:', {
        selectedPeriods,
        validSelections,
        buttonExists: !!compareBtn
    });
    
    if (compareBtn) {
        compareBtn.disabled = validSelections < 1;
        
        // Update button text while preserving the icon
        const iconSpan = compareBtn.querySelector('.icon');
        const buttonText = validSelections < 1 ? 
            'Выберите минимум 1 период' : 
            validSelections === 1 ? 
            'Показать 1 период' :
            `Сравнить ${validSelections} периодов`;
        
        compareBtn.innerHTML = iconSpan ? 
            `${iconSpan.outerHTML} ${buttonText}` : 
            buttonText;
    }
}

async function handleMultiPeriodCompare() {
    console.log('handleMultiPeriodCompare called');
    const validPeriods = selectedPeriods.filter(period => period !== '');
    
    console.log('Valid periods for comparison:', validPeriods);
    
    if (validPeriods.length < 1) {
        console.log('No periods selected');
        uiManager.showStatus('Выберите минимум 1 период для отображения', 'error');
        return;
    }
    
    try {
        // Get data for all selected periods
        console.log('Fetching data for periods:', validPeriods);
        
        // First, let's see what's actually in storage
        console.log('Step 1: Getting all storage data...');
        const allStoredData = await storageManager.getAllData();
        console.log('All storage keys:', Object.keys(allStoredData));
        console.log('Period keys in storage:', Object.keys(allStoredData).filter(k => k.startsWith('period_')));
        
        console.log('Step 2: Getting specific period data...');
        const storedData = await storageManager.getData(validPeriods);
        console.log('Retrieved stored data:', storedData);
        
        multiPeriodData = [];
        
        for (const periodKey of validPeriods) {
            const data = storedData[periodKey];
            console.log(`Processing period ${periodKey}:`, {
                hasData: !!data,
                hasKpis: !!(data && data.kpis),
                kpis: data?.kpis
            });
            
            if (data && (data.kpis || data.totalResidents !== undefined)) {
                // Convert old data structure to new format if needed
                let processedData = data;
                if (!data.kpis && data.totalResidents !== undefined) {
                    processedData = {
                        ...data,
                        kpis: {
                            residents: data.totalResidents || 0,
                            employees: data.employeeCount || 0,
                            services: data.totalIncome || 0,
                            export: data.exportVolume || 0
                        }
                    };
                }
                
                multiPeriodData.push({
                    period: periodKey.replace('period_', ''),
                    data: processedData
                });
            }
        }
        
        console.log('Final multiPeriodData:', multiPeriodData);
        
        if (multiPeriodData.length < 1) {
            console.error('No valid periods found:', {
                requestedPeriods: validPeriods.length,
                validDataFound: multiPeriodData.length,
                availableStorageKeys: Object.keys(storedData)
            });
            uiManager.showStatus(`Недостаточно данных для отображения. Найдено ${multiPeriodData.length} из ${validPeriods.length} периодов с данными`, 'error');
            return;
        }
        
        displayMultiPeriodComparison();
        domCache.get('multi-period-export-section').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error in multi-period comparison:', error);
        console.error('Error stack:', error.stack);
        uiManager.showStatus(`Ошибка при сравнении периодов: ${error.message}`, 'error');
    }
}

function displayMultiPeriodComparison() {
    const resultsContainer = domCache.get('multi-period-results');
    
    // Create table
    const table = document.createElement('table');
    table.className = 'multi-period-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const metricHeader = document.createElement('th');
    metricHeader.textContent = 'Показатель';
    headerRow.appendChild(metricHeader);
    
    multiPeriodData.forEach(periodData => {
        const th = document.createElement('th');
        th.textContent = periodData.period;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body with metrics
    const tbody = document.createElement('tbody');
    
    const metrics = [
        { key: 'residents', label: 'Количество резидентов' },
        { key: 'employees', label: 'Количество сотрудников' },
        { key: 'services', label: 'Услуги (млрд сум)' },
        { key: 'export', label: 'Экспорт (млн долл США)' }
    ];
    
    metrics.forEach(metric => {
        const row = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        console.log('Setting label:', metric.label, 'Length:', metric.label.length);
        labelCell.textContent = metric.label;
        labelCell.style.fontWeight = '600';
        row.appendChild(labelCell);
        
        multiPeriodData.forEach(periodData => {
            const cell = document.createElement('td');
            const value = periodData.data.kpis[metric.key];
            cell.textContent = value !== undefined ? formatNumber(value) : 'N/A';
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(table);
    resultsContainer.classList.remove('hidden');
}

function formatNumber(num) {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString();
}

async function handleMultiPeriodExport() {
    if (multiPeriodData.length < 1) {
        uiManager.showStatus('Нет данных для экспорта', 'error');
        return;
    }
    
    try {
        uiManager.showStatus('Подготовка CSV файла...', 'info');
        const csvContent = await generateMultiPeriodCSV();
        downloadCSV(csvContent, `multi-period-comparison-with-districts-${new Date().toISOString().slice(0, 10)}.csv`);
        uiManager.showStatus('CSV файл с данными районов успешно экспортирован', 'success');
    } catch (error) {
        console.error('Error exporting multi-period CSV:', error);
        uiManager.showStatus('Ошибка при экспорте CSV', 'error');
    }
}

async function generateMultiPeriodCSV() {
    const headers = ['Показатель', ...multiPeriodData.map(p => p.period)];
    const rows = [headers];
    
    // Main metrics
    const metrics = [
        { key: 'residents', label: 'Количество резидентов' },
        { key: 'employees', label: 'Количество сотрудников' },
        { key: 'services', label: 'Услуги (млрд сум)' },
        { key: 'export', label: 'Экспорт (млн долл США)' }
    ];
    
    metrics.forEach(metric => {
        const row = [metric.label];
        multiPeriodData.forEach(periodData => {
            const value = periodData.data.kpis[metric.key];
            row.push(value !== undefined ? value : 'N/A');
        });
        rows.push(row);
    });
    
    // Add district data section
    try {
        const allStoredData = await storageManager.getAllData();
        const districtKeys = Object.keys(allStoredData).filter(k => k.startsWith('district_'));
        
        if (districtKeys.length > 0) {
            // Add empty row separator
            rows.push(['']);
            rows.push(['ДАННЫЕ ПО РАЙОНАМ']);
            rows.push(['']);
            
            // Group districts by name and period
            const districtsByPeriod = {};
            multiPeriodData.forEach(periodData => {
                const periodKey = `period_${periodData.period}`;
                const matchingDistricts = districtKeys.filter(key => 
                    key.includes(periodData.period.replace('Анд-', ''))
                );
                
                districtsByPeriod[periodData.period] = matchingDistricts.map(key => {
                    const data = allStoredData[key];
                    const districtName = key.replace('district_', '').split('_')[0];
                    return {
                        name: districtName,
                        data: data
                    };
                });
            });
            
            // Create district comparison table
            const allDistrictNames = new Set();
            Object.values(districtsByPeriod).forEach(districts => {
                districts.forEach(d => allDistrictNames.add(d.name));
            });
            
            if (allDistrictNames.size > 0) {
                // District headers
                const districtHeaders = ['Район/Период', ...multiPeriodData.map(p => p.period)];
                rows.push(districtHeaders);
                
                // For each metric, show district breakdown
                metrics.forEach(metric => {
                    rows.push([`${metric.label} по районам`]);
                    
                    Array.from(allDistrictNames).forEach(districtName => {
                        const row = [districtName];
                        multiPeriodData.forEach(periodData => {
                            const district = districtsByPeriod[periodData.period]?.find(d => d.name === districtName);
                            let value = 'N/A';
                            
                            if (district && district.data) {
                                if (district.data.kpis) {
                                    value = district.data.kpis[metric.key] || 'N/A';
                                } else {
                                    // Convert old data structure
                                    switch(metric.key) {
                                        case 'residents':
                                            value = district.data.totalResidents || 'N/A';
                                            break;
                                        case 'employees':
                                            value = district.data.employeeCount || 'N/A';
                                            break;
                                        case 'services':
                                            value = district.data.totalIncome || 'N/A';
                                            break;
                                        case 'export':
                                            value = district.data.exportVolume || 'N/A';
                                            break;
                                    }
                                }
                            }
                            row.push(value);
                        });
                        rows.push(row);
                    });
                    rows.push(['']); // Empty row between metrics
                });
            }
        }
    } catch (error) {
        console.error('Error adding district data to CSV:', error);
    }
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function downloadCSV(content, filename) {
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Startup Management functionality
let selectedStartupCompanies = [];
let currentStartupPeriod = '';
let lastSelectedStartupPeriod = '';

async function handleAddStartups() {
    const startupPeriodSelect = domCache.get('startup-period-select');
    const selectedPeriodKey = startupPeriodSelect.value;
    
    if (!selectedPeriodKey) {
        uiManager.showStatus('Выберите период для работы со стартапами', 'error');
        return;
    }
    
    uiManager.showStatus('Загружаю компании для выбора стартапов...', 'info');
    
    try {
        const periodData = await storageManager.getData([selectedPeriodKey]);
        const data = periodData[selectedPeriodKey];
        
        if (!data || !data.companies || data.companies.length === 0) {
            uiManager.showStatus('В выбранном периоде нет данных о компаниях', 'error');
            return;
        }
        
        currentStartupPeriod = selectedPeriodKey;
        const existingStartups = await storageManager.getStartupCompaniesForPeriod(selectedPeriodKey, data.companies);
        
        displayCompanySelection(data.companies, existingStartups);
        uiManager.showStatus('Выберите компании, которые являются стартапами', 'info');
        
    } catch (error) {
        console.error('Error loading companies for startup selection:', error);
        uiManager.showStatus(`Ошибка загрузки данных: ${error.message}`, 'error');
    }
}

function displayCompanySelection(companies, existingStartups = []) {
    const modal = domCache.get('startup-selection-modal');
    const companyList = domCache.get('startup-company-list');
    
    selectedStartupCompanies = [...existingStartups];
    
    let companyHTML = '';
    
    companies.forEach((company, index) => {
        const matchingStartup = existingStartups.find(startup => 
            startup.name === company.name && (startup.region || '') === (company.region || '')
        );
        const isSelected = !!matchingStartup;
        const isInherited = matchingStartup?.inheritedFrom;
        
        companyHTML += `
            <div class="company-item" style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #f0f0f0; background: #ffffff;">
                <input type="checkbox" 
                       id="company-${index}" 
                       data-company-index="${index}"
                       ${isSelected ? 'checked' : ''}
                       style="margin-right: 10px;">
                <label for="company-${index}" style="flex: 1; cursor: pointer; font-size: 13px;">
                    <strong>${company.name || 'Без названия'}</strong>
                    ${isInherited ? `<span style="color: #718096; margin-left: 8px; font-size: 11px;">(из ${matchingStartup.inheritedFrom})</span>` : ''}
                    ${company.region ? `<span style="color: #666; margin-left: 8px;">(${company.region})</span>` : ''}
                    ${company.employees ? `<span style="color: #888; margin-left: 8px;">${company.employees} сотр.</span>` : ''}
                </label>
            </div>
        `;
    });
    
    companyList.innerHTML = companyHTML;
    
    // Add event listeners to checkboxes
    const checkboxes = companyList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const companyIndex = parseInt(e.target.dataset.companyIndex);
            const company = companies[companyIndex];
            
            if (e.target.checked) {
                // Add to selected startups
                if (!selectedStartupCompanies.some(s => s.name === company.name && s.region === company.region)) {
                    const startupData = {
                        name: company.name,
                        region: company.region,
                        employeeCount: company.employees, // Map employees field to employeeCount for consistency
                        employees: company.employees, // Keep both fields for compatibility
                        direction: company.direction,
                        index: companyIndex
                    };
                    
                    console.log('🔍 DEBUG adding startup:', {
                        companyName: company.name,
                        companyEmployees: company.employees,
                        startupData
                    });
                    
                    selectedStartupCompanies.push(startupData);
                }
            } else {
                // Remove from selected startups
                selectedStartupCompanies = selectedStartupCompanies.filter(s => 
                    !(s.name === company.name && s.region === company.region)
                );
            }
            
            updateStartupSelectionCount();
        });
    });
    
    modal.classList.remove('hidden');
    updateStartupSelectionCount();
}

function updateStartupSelectionCount() {
    const saveBtn = domCache.get('save-startups-btn');
    if (saveBtn) {
        const iconSpan = saveBtn.querySelector('.icon');
        const count = selectedStartupCompanies.length;
        const buttonText = count > 0 ? `Сохранить ${count} стартапов` : 'Сохранить стартапы';
        saveBtn.innerHTML = iconSpan ? `${iconSpan.outerHTML} ${buttonText}` : buttonText;
        saveBtn.disabled = count === 0;
    }
}

async function handleSaveStartups() {
    try {
        // Get the current period data to identify all companies
        const periodData = await storageManager.getData([currentStartupPeriod]);
        const data = periodData[currentStartupPeriod];
        
        if (!data || !data.companies) {
            uiManager.showStatus('Ошибка: не удалось загрузить данные периода', 'error');
            return;
        }
        
        // Get existing startups for this period (including inherited ones)
        const existingStartups = await storageManager.getStartupCompaniesForPeriod(currentStartupPeriod, data.companies);
        
        // Find companies that were unchecked (removed from startup list)
        const uncheckedCompanies = existingStartups.filter(existingStartup => 
            !selectedStartupCompanies.some(selected => 
                selected.name === existingStartup.name && 
                (selected.region || '') === (existingStartup.region || '')
            )
        );
        
        console.log('🔍 DEBUG startup changes:', {
            existingStartups: existingStartups.length,
            selectedStartups: selectedStartupCompanies.length,
            uncheckedCompanies: uncheckedCompanies.length,
            unchecked: uncheckedCompanies.map(c => c.name)
        });
        
        // Remove unchecked companies from ALL periods
        for (const uncheckedCompany of uncheckedCompanies) {
            console.log(`🗑️ Globally removing startup: ${uncheckedCompany.name}`);
            await storageManager.removeStartupFromAllPeriods(uncheckedCompany.name, uncheckedCompany.region);
        }
        
        // Save the selected startups for current period
        if (selectedStartupCompanies.length > 0) {
            await storageManager.saveStartups(currentStartupPeriod, selectedStartupCompanies);
        }
        
        const modal = domCache.get('startup-selection-modal');
        modal.classList.add('hidden');
        
        const periodName = currentStartupPeriod.replace('period_', '');
        const removedCount = uncheckedCompanies.length;
        
        let statusMessage = '';
        if (selectedStartupCompanies.length > 0) {
            statusMessage = `Сохранено ${selectedStartupCompanies.length} стартапов для периода ${periodName}`;
        }
        if (removedCount > 0) {
            statusMessage += statusMessage ? `. Удалено ${removedCount} стартапов из всех периодов` : `Удалено ${removedCount} стартапов из всех периодов`;
        }
        if (!statusMessage) {
            statusMessage = `Нет стартапов для периода ${periodName}`;
        }
        
        uiManager.showStatus(statusMessage, 'success');
        
        selectedStartupCompanies = [];
        currentStartupPeriod = '';
        
    } catch (error) {
        console.error('Error saving startups:', error);
        uiManager.showStatus(`Ошибка сохранения стартапов: ${error.message}`, 'error');
    }
}

async function handleCancelStartups() {
    const modal = domCache.get('startup-selection-modal');
    modal.classList.add('hidden');
    
    selectedStartupCompanies = [];
    currentStartupPeriod = '';
    
    uiManager.showStatus('Выбор стартапов отменен', 'info');
}

async function handleShowStartups() {
    const startupPeriodSelect = domCache.get('startup-period-select');
    const selectedPeriodKey = startupPeriodSelect.value;
    
    if (!selectedPeriodKey) {
        uiManager.showStatus('Выберите период для просмотра стартапов', 'error');
        return;
    }
    
    try {
        // Get period data to check for available companies
        const periodData = await storageManager.getData([selectedPeriodKey]);
        const data = periodData[selectedPeriodKey];
        
        console.log('🔍 DEBUG handleShowStartups:', {
            selectedPeriodKey,
            data: data,
            companies: data?.companies?.length || 0,
            companySample: data?.companies?.slice(0, 2).map(c => ({name: c.name, employees: c.employees}))
        });
        
        if (!data || !data.companies || data.companies.length === 0) {
            uiManager.showStatus('В выбранном периоде нет данных о компаниях', 'error');
            const displaySection = domCache.get('startup-display-section');
            displaySection.classList.add('hidden');
            return;
        }
        
        let startups = await storageManager.getStartupCompaniesForPeriod(selectedPeriodKey, data.companies);
        
        console.log('🔍 DEBUG after getStartupCompaniesForPeriod:', {
            startupsFound: startups.length,
            startupSample: startups.slice(0, 2).map(s => ({name: s.name, employeeCount: s.employeeCount, employees: s.employees}))
        });
        
        // TEMPORARY FIX: Refresh startup employee data with current period data
        console.log('🔍 DEBUG Available companies in period:', data.companies.map(c => ({
            name: c.name,
            employees: c.employees,
            region: c.region
        })));
        
        startups = startups.map(startup => {
            // Try exact match first
            let matchingCompany = data.companies.find(company => 
                company.name === startup.name && (company.region || '') === (startup.region || '')
            );
            
            // If no exact match, try fuzzy matching
            if (!matchingCompany) {
                const cleanStartupName = startup.name.replace(/["""]/g, '"').trim().toUpperCase();
                matchingCompany = data.companies.find(company => {
                    const cleanCompanyName = company.name.replace(/["""]/g, '"').trim().toUpperCase();
                    return cleanCompanyName === cleanStartupName && (company.region || '') === (startup.region || '');
                });
            }
            
            console.log(`🔍 DEBUG matching for startup "${startup.name}":`, {
                startupRegion: startup.region || 'EMPTY',
                matchingCompany: matchingCompany ? {
                    name: matchingCompany.name,
                    employees: matchingCompany.employees,
                    region: matchingCompany.region || 'EMPTY'
                } : null
            });
            
            if (matchingCompany && matchingCompany.employees) {
                console.log(`🔧 FIXING employee count for ${startup.name}: ${matchingCompany.employees}`);
                return {
                    ...startup,
                    employeeCount: matchingCompany.employees,
                    employees: matchingCompany.employees
                };
            }
            
            console.log(`❌ No matching company found for startup: ${startup.name}`);
            return startup;
        });
        
        if (startups.length === 0) {
            uiManager.showStatus('В выбранном периоде нет отмеченных стартапов', 'warning');
            const displaySection = domCache.get('startup-display-section');
            displaySection.classList.add('hidden');
            return;
        }
        
        displayStartupCompanies(startups, selectedPeriodKey);
        
    } catch (error) {
        console.error('Error showing startups:', error);
        uiManager.showStatus(`Ошибка загрузки стартапов: ${error.message}`, 'error');
    }
}

function displayStartupCompanies(startups, periodKey) {
    const displaySection = domCache.get('startup-display-section');
    const periodName = periodKey.replace('period_', '');
    
    console.log('🔍 DEBUG displayStartupCompanies:', {
        periodKey,
        startupsCount: startups.length,
        startups: startups.map(s => ({
            name: s.name,
            employeeCount: s.employeeCount,
            employees: s.employees,
            inheritedFrom: s.inheritedFrom
        }))
    });
    
    // Calculate total employees in startups
    const totalEmployees = startups.reduce((total, startup) => {
        const emp = startup.employeeCount || startup.employees || 0;
        console.log(`Employee count for ${startup.name}: employeeCount=${startup.employeeCount}, employees=${startup.employees}, using=${emp}`);
        return total + emp;
    }, 0);
    
    let html = `
        <h4 style="margin-bottom: 15px; color: #2d3748;">⭐ Стартапы в периоде "${periodName}"</h4>
        
        <div class="startup-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f0fff4; border: 1px solid #c6f6d5; border-radius: 8px; padding: 15px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #38a169; margin-bottom: 4px;">${startups.length}</div>
                <div style="font-size: 12px; color: #4a5568; font-weight: 600;">КОМПАНИЙ</div>
            </div>
            <div style="background: #edf2f7; border: 1px solid #cbd5e0; border-radius: 8px; padding: 15px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #2d3748; margin-bottom: 4px;">${totalEmployees.toLocaleString()}</div>
                <div style="font-size: 12px; color: #4a5568; font-weight: 600;">СОТРУДНИКОВ</div>
            </div>
        </div>
        
        <div class="startup-table" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: white;">
            <div class="startup-header" style="background: #f7fafc; border-bottom: 1px solid #e2e8f0; padding: 12px; display: grid; grid-template-columns: 1fr 120px 100px; gap: 12px; font-weight: 600; color: #4a5568; font-size: 12px; text-transform: uppercase;">
                <div>КОМПАНИЯ</div>
                <div style="text-align: center;">СОТРУДНИКИ</div>
                <div style="text-align: center;">СТАТУС</div>
            </div>
            <div style="max-height: 300px; overflow-y: auto;">
    `;
    
    startups.forEach((startup, index) => {
        const backgroundColor = startup.inheritedFrom ? 
            (index % 2 === 0 ? '#fffbf0' : '#fef5e7') : 
            (index % 2 === 0 ? '#ffffff' : '#f8f9fa');
        
        const employees = startup.employeeCount || startup.employees;
        const employeeDisplay = employees ? formatNumber(employees) : 'N/A';
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        
        html += `
            <div class="startup-row" style="display: grid; grid-template-columns: 1fr 120px 100px; gap: 12px; align-items: center; padding: 12px; border-bottom: 1px solid #e2e8f0; background: ${rowBg};">
                <div class="company-info" style="min-width: 0;">
                    <div class="company-name" style="font-weight: 600; color: #2d3748; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">
                        ${startup.name || 'Без названия'}
                    </div>
                    ${startup.inheritedFrom ? `<div style="color: #718096; font-size: 10px; margin-bottom: 2px;">из ${startup.inheritedFrom}</div>` : ''}
                    ${startup.region ? `<div style="color: #718096; font-size: 10px;">📍 ${startup.region}</div>` : ''}
                </div>
                <div class="employee-count" style="text-align: center; font-weight: 600; color: #2d3748; font-size: 14px;">
                    ${employeeDisplay}
                </div>
                <div class="status-badge" style="text-align: center;">
                    <span style="display: inline-block; color: #38a169; font-size: 10px; font-weight: 700; background: #f0fff4; border: 1px solid #68d391; padding: 4px 8px; border-radius: 12px; text-transform: uppercase;">
                        СТАРТАП
                    </span>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        
        <div style="margin-top: 15px; padding: 12px; background: #f7fafc; border-left: 4px solid #4299e1; border-radius: 0 8px 8px 0; font-size: 12px; color: #2d3748;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="font-weight: 600;">💡 Информация:</div>
                <button id="export-startup-csv-btn" class="btn btn-outline" style="font-size: 10px; padding: 4px 8px; margin: -2px 0;" data-period-key="${periodKey}">
                    <span class="icon icon-table"></span>
                    CSV Экспорт
                </button>
            </div>
            <div style="line-height: 1.4;">
                • Стартапы отмечены для периода <strong>"${periodName}"</strong><br>
                • Компании с пометкой "из ..." унаследованы из других периодов<br>
                • Используйте кнопку "Выбрать стартапы" для редактирования списка
            </div>
        </div>
    `;
    
    displaySection.innerHTML = html;
    displaySection.classList.remove('hidden');
    
    uiManager.showStatus(`Показано ${startups.length} стартапов из периода ${periodName} (${totalEmployees} сотрудников)`, 'success');
    
    // Store current startup data for CSV export
    window.currentStartupData = { startups, periodKey, periodName };
}

function generateStartupCSV(startups, periodName) {
    const headers = ['№', 'Название компании', 'Регион', 'Количество сотрудников', 'Период', 'Статус'];
    const rows = [headers];
    
    startups.forEach((startup, index) => {
        const row = [
            index + 1,
            startup.name || 'N/A',
            startup.region || 'N/A',
            startup.employees || startup.employeeCount || 0,
            startup.inheritedFrom ? startup.inheritedFrom : periodName,
            startup.inheritedFrom ? 'Унаследован' : 'Текущий период'
        ];
        rows.push(row);
    });
    
    // Add summary row
    const totalEmployees = startups.reduce((sum, s) => sum + (s.employees || s.employeeCount || 0), 0);
    rows.push(['', '', 'ИТОГО:', totalEmployees, '', `${startups.length} стартапов`]);
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

async function handleManageStartups() {
    const startupSection = domCache.get('startup-management-section');
    
    if (startupSection.classList.contains('hidden')) {
        // Show startup section
        startupSection.classList.remove('hidden');
        
        // Load periods into dropdown if not already loaded or if data has changed
        await uiManager.loadSavedPeriodsIntoDropdowns();
        
        // Restore last selected period if available
        const startupPeriodSelect = domCache.get('startup-period-select');
        if (lastSelectedStartupPeriod && startupPeriodSelect) {
            startupPeriodSelect.value = lastSelectedStartupPeriod;
            
            // Trigger change event to enable buttons
            const event = new Event('change');
            startupPeriodSelect.dispatchEvent(event);
            
            // Auto-show startups if period was selected
            setTimeout(() => handleShowStartups(), 100);
        }
        
        uiManager.showStatus('Управление стартапами активировано', 'info');
    } else {
        // Hide startup section
        startupSection.classList.add('hidden');
        
        // Hide any open modals
        const modal = domCache.get('startup-selection-modal');
        const displaySection = domCache.get('startup-display-section');
        modal.classList.add('hidden');
        displaySection.classList.add('hidden');
        
        uiManager.showStatus('Управление стартапами скрыто', 'info');
    }
}

async function handleManageStartupsComparison() {
    // Get the periods from the current comparison
    if (!comparisonResult.period1 || !comparisonResult.period2) {
        uiManager.showStatus('Сначала выполните сравнение периодов', 'error');
        return;
    }
    
    const period1Key = `period_${comparisonResult.period1.key}`;
    const period2Key = `period_${comparisonResult.period2.key}`;
    
    // Show startup management section
    const startupSection = domCache.get('startup-management-section');
    startupSection.classList.remove('hidden');
    
    // Load periods and set to first comparison period
    await uiManager.loadSavedPeriodsIntoDropdowns();
    const startupPeriodSelect = domCache.get('startup-period-select');
    
    if (startupPeriodSelect) {
        startupPeriodSelect.value = period1Key;
        lastSelectedStartupPeriod = period1Key;
        
        // Enable buttons
        const addBtn = domCache.get('add-startups-btn');
        const showBtn = domCache.get('show-startups-btn');
        if (addBtn && showBtn) {
            addBtn.disabled = false;
            showBtn.disabled = false;
        }
        
        // Auto-show startups for the selected period
        setTimeout(() => handleShowStartups(), 100);
    }
    
    uiManager.showStatus(`Управление стартапами для сравнения: ${comparisonResult.period1.key} vs ${comparisonResult.period2.key}`, 'info');
}

// Export/Import functionality
async function handleExportAllData() {
    uiManager.showStatus('Экспортирую все данные...', 'info');
    
    try {
        const allData = await storageManager.getAllData();
        const dataKeys = Object.keys(allData);
        
        if (dataKeys.length === 0) {
            uiManager.showStatus('Нет данных для экспорта', 'warning');
            return;
        }
        
        // Create export object with metadata
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            extensionName: 'IT Park Dashboard Helper',
            totalRecords: dataKeys.length,
            periodRecords: dataKeys.filter(k => k.startsWith('period_')).length,
            districtRecords: dataKeys.filter(k => k.startsWith('district_')).length,
            data: allData
        };
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `datapark-backup-${timestamp}.json`;
        
        // Create and download file
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        uiManager.showStatus(`Экспорт завершен! Сохранено ${dataKeys.length} записей в файл ${filename}`, 'success');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        uiManager.showStatus(`Ошибка экспорта: ${error.message}`, 'error');
    }
}

async function handleImportAllData() {
    const fileInput = domCache.get('import-file-input');
    if (!fileInput) {
        uiManager.showStatus('Ошибка: элемент выбора файла не найден', 'error');
        return;
    }
    
    fileInput.click();
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Clear the file input for future use
    event.target.value = '';
    
    if (!file.name.toLowerCase().endsWith('.json')) {
        uiManager.showStatus('Пожалуйста, выберите JSON файл', 'error');
        return;
    }
    
    uiManager.showStatus('Импортирую данные...', 'info');
    
    try {
        const fileText = await readFileAsText(file);
        const importData = JSON.parse(fileText);
        
        // Validate import data structure
        if (!importData.data || typeof importData.data !== 'object') {
            throw new Error('Неверная структура файла: отсутствует поле data');
        }
        
        // Show confirmation dialog with import details
        const totalRecords = Object.keys(importData.data).length;
        const periodRecords = Object.keys(importData.data).filter(k => k.startsWith('period_')).length;
        const districtRecords = Object.keys(importData.data).filter(k => k.startsWith('district_')).length;
        
        const confirmMessage = `Импортировать данные?
        
Файл содержит:
• Всего записей: ${totalRecords}
• Периодов: ${periodRecords}
• Районов: ${districtRecords}
• Дата экспорта: ${importData.exportDate ? new Date(importData.exportDate).toLocaleString() : 'неизвестна'}

⚠️ ВНИМАНИЕ: Существующие данные будут заменены!
        
Вы уверены?`;
        
        if (!confirm(confirmMessage)) {
            uiManager.showStatus('Импорт отменен', 'info');
            return;
        }
        
        // Clear existing data first
        const existingCount = await storageManager.clearAllData();
        
        // Import new data
        await browserAPI.storage.local.set(importData.data);
        
        // Clear global variables
        comparisonResult = {};
        districtComparisonResult = {};
        
        // Refresh UI
        uiManager.clearUI();
        await uiManager.loadSavedPeriodsIntoDropdowns();
        await uiManager.loadSavedDistrictsIntoDropdowns();
        
        uiManager.showStatus(`Импорт успешен! Заменено ${existingCount} записей, загружено ${totalRecords} новых записей`, 'success');
        
    } catch (error) {
        console.error('Error importing data:', error);
        let errorMessage = 'Ошибка импорта';
        
        if (error instanceof SyntaxError) {
            errorMessage = 'Ошибка: файл содержит некорректный JSON';
        } else if (error.message) {
            errorMessage = `Ошибка импорта: ${error.message}`;
        }
        
        uiManager.showStatus(errorMessage, 'error');
    }
}

// Helper function to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Ошибка чтения файла'));
        reader.readAsText(file, 'UTF-8');
    });
}

// Debug function to check storage contents
window.debugStorage = async function() {
    try {
        const allData = await storageManager.getAllData();
        console.log('=== STORAGE DEBUG ===');
        console.log('All keys:', Object.keys(allData));
        console.log('Period keys:', Object.keys(allData).filter(k => k.startsWith('period_')));
        console.log('District keys:', Object.keys(allData).filter(k => k.startsWith('district_')));
        
        // Show sample data structure
        const periodKeys = Object.keys(allData).filter(k => k.startsWith('period_'));
        if (periodKeys.length > 0) {
            const sampleKey = periodKeys[0];
            console.log(`Sample period data (${sampleKey}):`, allData[sampleKey]);
        }
        
        // Show district data
        const districtKeys = Object.keys(allData).filter(k => k.startsWith('district_'));
        if (districtKeys.length > 0) {
            const sampleDistrictKey = districtKeys[0];
            console.log(`Sample district data (${sampleDistrictKey}):`, allData[sampleDistrictKey]);
        }
        console.log('=== END STORAGE DEBUG ===');
    } catch (error) {
        console.error('Storage debug error:', error);
    }
};

// Theme management
function initializeTheme() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('datapark-theme') || 'light';
    applyTheme(savedTheme);
}

function handleThemeToggle() {
    const body = document.body;
    const currentTheme = body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    applyTheme(newTheme);
    localStorage.setItem('datapark-theme', newTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const themeToggle = domCache.get('theme-toggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        themeToggle?.classList.add('dark');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        body.classList.remove('dark-theme');
        themeToggle?.classList.remove('dark');
        if (themeIcon) themeIcon.textContent = '🌙';
    }
}
