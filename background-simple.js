// Simple background script for testing
console.log('🚀 Background script started');

// Test on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed');
});

// Test message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request);
    
    if (request.type === 'test') {
        console.log('🧪 Test message received');
        sendResponse({ success: true, message: 'Working!' });
    }
    
    return true;
});

// Test command handler
chrome.commands.onCommand.addListener((command) => {
    console.log('🎯 COMMAND RECEIVED:', command);
    
    // Simple notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iIzY2N2VlYSIvPgo8cGF0aCBkPSJNMTYgMjBoMTZ2NGgtMTZ2LTR6bTAgNmgxMnY0aC0xMnYtNHptMC0xMmgxNnY0aC0xNnYtNHoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
        title: 'Datapark',
        message: `Command received: ${command}`
    });
});