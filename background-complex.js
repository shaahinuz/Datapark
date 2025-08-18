// Background service worker for handling hotkeys and notifications

// Log when the service worker loads
console.log('🔧 Datapark service worker loaded');

// Service worker ready event
self.addEventListener('activate', () => {
    console.log('🚀 Service worker activated');
});

// Extension installed/updated event
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('🔧 Extension installed/updated:', details.reason);
    
    try {
        // Check if commands are registered
        const commands = await chrome.commands.getAll();
        console.log('📋 Registered commands:', commands);
        
        if (commands.length === 0) {
            console.warn('⚠️ No commands registered! Check manifest.json');
        } else {
            commands.forEach(cmd => {
                console.log(`✅ Command: ${cmd.name} -> ${cmd.shortcut || 'No shortcut assigned'}`);
            });
        }
        
        // Test notification
        showNotification('Datapark', 'Extension ready! Use Ctrl+Shift+1/2/3 for hotkeys');
    } catch (error) {
        console.error('Error during installation:', error);
    }
});

// Message handler for communication with popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received in background:', request);
    
    if (request.type === 'test') {
        console.log('🧪 Test message from popup:', request.message);
        sendResponse({ 
            success: true, 
            message: 'Background script is working!',
            timestamp: new Date().toISOString()
        });
        
        // Also show a notification to confirm it's working
        showNotification('Datapark', 'Background script test successful! 🎉');
        return true; // Keep channel open for async response
    }
    
    return false;
});

// Add multiple event listeners to ensure commands are caught
chrome.commands.onCommand.addListener(async (command) => {
    console.log('🎯 Command received via onCommand:', command);
    await handleCommand(command);
});

// Backup listener for service worker
self.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'command') {
        console.log('🎯 Command received via message:', event.data.command);
        await handleCommand(event.data.command);
    }
});

// Main command handler
async function handleCommand(command) {
    console.log('🔥 Processing command:', command);
    
    try {
        // Always show we received the command
        console.log('📢 Command handler triggered:', command);
        await showNotification('Datapark', `Hotkey pressed: ${command} 🎯`);
        
        // Get the active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (!tab) {
            console.log('❌ No active tab found');
            await showNotification('Datapark', 'No active tab found');
            return;
        }

        console.log('📋 Active tab URL:', tab.url);

        // Check if we're on an IT Park domain
        if (!tab.url.includes('it-park.uz')) {
            console.log('⚠️ Not on IT Park domain:', tab.url);
            await showNotification('Datapark', 'Hotkeys work only on IT Park dashboard pages');
            return;
        }

        console.log('✅ On IT Park domain, executing command:', command);

        switch (command) {
            case 'save-general-data':
                await handleHotkeySaveGeneral(tab);
                break;
            case 'save-district-data':
                await handleHotkeySaveDistrict(tab);
                break;
            case 'quick-detect-district':
                await handleHotkeyDetectDistrict(tab);
                break;
            default:
                console.log('❓ Unknown command:', command);
                await showNotification('Datapark', `Unknown command: ${command}`);
        }
    } catch (error) {
        console.error('❌ Error handling command:', error);
        await showNotification('Datapark', `Error: ${error.message}`);
    }
}

async function handleHotkeySaveGeneral(tab) {
    try {
        showNotification('Datapark', 'Saving general data... ⏳', 'basic');
        
        const pageData = await scrapeDashboardDataInTab(tab);
        if (!pageData || !pageData.periodKey) {
            throw new Error("Could not determine period from page");
        }

        // Save as general data
        const key = `period_${pageData.periodKey}`;
        await chrome.storage.local.set({ [key]: pageData.data });
        
        showNotification('Datapark ✅', `General data for ${pageData.periodKey} saved successfully! 📊`, 'basic');
    } catch (error) {
        showNotification('Datapark ❌', `Failed to save general data: ${error.message}`, 'basic');
    }
}

async function handleHotkeySaveDistrict(tab) {
    try {
        showNotification('Datapark', 'Detecting district and saving data... ⏳', 'basic');
        
        const pageData = await scrapeDashboardDataInTab(tab);
        if (!pageData || !pageData.periodKey) {
            throw new Error("Could not determine period from page");
        }

        if (!pageData.detectedDistrict) {
            throw new Error("Could not auto-detect district. Use Ctrl+Shift+3 to detect first, or save manually via extension popup.");
        }

        // Save as district data
        const key = `district_${pageData.detectedDistrict}_${pageData.periodKey}`;
        await chrome.storage.local.set({ [key]: pageData.data });
        
        showNotification('Datapark ✅', `District "${pageData.detectedDistrict}" data (${pageData.periodKey}) saved successfully! 🏘️`, 'basic');
    } catch (error) {
        showNotification('Datapark ❌', `Failed to save district data: ${error.message}`, 'basic');
    }
}

async function handleHotkeyDetectDistrict(tab) {
    try {
        showNotification('Datapark', 'Detecting district... 🔍', 'basic');
        
        const pageData = await scrapeDashboardDataInTab(tab);
        
        if (pageData.detectedDistrict) {
            showNotification('Datapark ✅', `District detected: "${pageData.detectedDistrict}" 🔍`, 'basic');
        } else {
            showNotification('Datapark ⚠️', 'No district detected on this page. Try using the extension popup for manual input.', 'basic');
        }
    } catch (error) {
        showNotification('Datapark ❌', `Detection failed: ${error.message}`, 'basic');
    }
}

async function scrapeDashboardDataInTab(tab) {
    const [result] = await chrome.scripting.executeScript({
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

                    // Scrape main KPIs (simplified version for background)
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
                    
                    // Scrape company table (simplified)
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

                    // Get period key
                    const yearInput = document.querySelector('.year-select .el-input__inner');
                    const quarterInput = document.querySelector('.quarter-select .el-input__inner');
                    const year = yearInput ? yearInput.value.match(/\d{4}/)[0] : 'YYYY';
                    const quarterMatch = quarterInput ? quarterInput.value.match(/\d/) : null;
                    const quarter = quarterMatch ? `Q${quarterMatch[0]}` : 'Q_';
                    
                    // Try to auto-detect district name (simplified version)
                    let detectedDistrict = null;
                    
                    // Check URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const districtParam = urlParams.get('district') || urlParams.get('rayon') || urlParams.get('tuman');
                    if (districtParam && districtParam !== 'all') {
                        detectedDistrict = districtParam;
                    }
                    
                    // Check page text for districts
                    if (!detectedDistrict) {
                        const pageText = document.body.innerText || '';
                        const knownDistricts = [
                            'Andijon', 'Asaka', 'Baliqchi', 'Bo\'z', 'Buloqboshi', 'Izboskan', 
                            'Jalolquduq', 'Qo\'rg\'ontepa', 'Marxamat', 'Oltinko\'l', 'Paxtaobod', 
                            'Qorasuv', 'Shahrikhon', 'Ulug\'nor', 'Xo\'jaobod', 'Xonobod',
                            'Bekobod', 'Bo\'ka', 'Chinoz', 'Qibray', 'Ohangaron', 'Oqqo\'rg\'on',
                            'Parkent', 'Piskent', 'Quyi Chirchiq', 'Yangiyo\'l', 'Yuqori Chirchiq',
                            'Zangiota', 'Toshkent', 'Chilonzor', 'Mirobod', 'Shayxontohur'
                        ];
                        
                        for (const district of knownDistricts) {
                            if (pageText.includes(district)) {
                                const occurrences = (pageText.match(new RegExp(district, 'gi')) || []).length;
                                if (occurrences >= 2) {
                                    detectedDistrict = district;
                                    break;
                                }
                            }
                        }
                    }
                    
                    resolve({
                        data: dashboardData,
                        periodKey: `${year}-${quarter}`,
                        detectedDistrict: detectedDistrict
                    });
                }, 500);
            });
        }
    });
    return result ? result.result : null;
}

async function showNotification(title, message) {
    console.log(`📢 ${title}: ${message}`);
    
    try {
        // Create a notification with proper Chrome API
        const notificationId = `datapark_${Date.now()}`;
        
        await chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzY2N2VlYSIvPgo8cGF0aCBkPSJNMTYgMjBoMTZ2NGgtMTZ2LTR6bTAgNmgxMnY0aC0xMnYtNHptMC0xMmgxNnY0aC0xNnYtNHoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
            title: title,
            message: message,
            priority: 1
        });
        
        console.log('✅ Notification created:', notificationId);
        
        // Auto-clear notification after 4 seconds
        setTimeout(() => {
            chrome.notifications.clear(notificationId);
        }, 4000);
        
    } catch (error) {
        console.error('❌ Notification error:', error);
    }
}