// Background service worker for IT Park Dashboard Helper Extension
console.log('🚀 Datapark background script started');

// Extension installed/updated event
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('🔧 Extension installed/updated:', details.reason);
    console.log('✅ Datapark extension is ready!');
});

// Message handler for communication with popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received in background:', request);
    
    
    // Handle storage operations for content script
    if (request.type === 'save-data') {
        handleSaveData(request.data, sendResponse);
        return true; // Keep channel open for async response
    }
    
    return false;
});

// Handle save data request from content script
async function handleSaveData(data, sendResponse) {
    try {
        console.log('💾 Saving data from content script:', data);
        
        const { key, value } = data;
        await chrome.storage.local.set({ [key]: value });
        
        console.log('✅ Data saved successfully with key:', key);
        sendResponse({ 
            success: true, 
            message: 'Data saved successfully' 
        });
    } catch (error) {
        console.error('❌ Error saving data:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}