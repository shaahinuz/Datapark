// On-screen notification overlay for better user feedback
class NotificationOverlay {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'datapark-notifications';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            max-width: 320px;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        const id = `notification-${Date.now()}`;
        notification.id = id;

        // Set colors based on type
        let backgroundColor, textColor, icon;
        switch (type) {
            case 'success':
                backgroundColor = '#10b981';
                textColor = 'white';
                icon = '✅';
                break;
            case 'error':
                backgroundColor = '#ef4444';
                textColor = 'white';
                icon = '❌';
                break;
            case 'warning':
                backgroundColor = '#f59e0b';
                textColor = 'white';
                icon = '⚠️';
                break;
            case 'info':
            default:
                backgroundColor = '#3b82f6';
                textColor = 'white';
                icon = 'ℹ️';
                break;
        }

        notification.style.cssText = `
            background: ${backgroundColor};
            color: ${textColor};
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            pointer-events: auto;
            cursor: pointer;
            transition: all 0.3s ease;
            transform: translateX(100%);
            opacity: 0;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            word-wrap: break-word;
        `;

        notification.innerHTML = `${icon} ${message}`;

        // Add click to dismiss
        notification.addEventListener('click', () => {
            this.hide(id);
        });

        this.container.appendChild(notification);
        this.notifications.push(id);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }

        return id;
    }

    hide(id) {
        const notification = document.getElementById(id);
        if (!notification) return;

        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== id);
        }, 300);
    }

    showSaving(districtName = null) {
        const message = districtName ? 
            `Сохраняю данные района "${districtName}"...` : 
            'Сохраняю общие данные...';
        return this.show(message, 'info', 0); // No auto-hide
    }

    showSaved(districtName = null, periodKey = null) {
        const message = districtName ? 
            `Данные района "${districtName}" (${periodKey}) успешно сохранены!` :
            `Общие данные (${periodKey}) успешно сохранены!`;
        return this.show(message, 'success', 4000);
    }

    showError(message) {
        return this.show(message, 'error', 5000);
    }

    showDetected(districtName) {
        return this.show(`Район "${districtName}" определен автоматически!`, 'success', 3000);
    }

    showDetectionFailed() {
        return this.show('Не удалось определить район. Проверьте консоль или введите вручную.', 'warning', 4000);
    }
}

// Make available globally
window.NotificationOverlay = NotificationOverlay;