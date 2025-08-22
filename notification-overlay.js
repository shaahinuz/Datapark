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

        // Set colors based on type using CSS variables
        let backgroundColor, textColor, iconClass;
        switch (type) {
            case 'success':
                backgroundColor = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                textColor = 'white';
                iconClass = 'check-circle';
                break;
            case 'error':
                backgroundColor = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                textColor = 'white';
                iconClass = 'x-circle';
                break;
            case 'warning':
                backgroundColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                textColor = 'white';
                iconClass = 'exclamation-triangle';
                break;
            case 'info':
            default:
                backgroundColor = 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)';
                textColor = 'white';
                iconClass = 'information-circle';
                break;
        }

        notification.style.cssText = `
            background: ${backgroundColor};
            color: ${textColor};
            padding: 14px 18px;
            border-radius: 12px;
            margin-bottom: 10px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
            pointer-events: auto;
            cursor: pointer;
            transition: all 0.3s ease;
            transform: translateX(100%);
            opacity: 0;
            font-size: 14px;
            font-weight: 600;
            max-width: 320px;
            word-wrap: break-word;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        `;

        // Create professional icon and message
        const iconSpan = document.createElement('span');
        iconSpan.className = `notification-icon notification-icon-${iconClass}`;
        iconSpan.style.cssText = `
            display: inline-block;
            width: 18px;
            height: 18px;
            margin-right: 8px;
            vertical-align: middle;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        `;
        
        // Set SVG icon based on type
        const svgIcons = {
            'check-circle': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'/%3E%3C/svg%3E",
            'x-circle': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'/%3E%3C/svg%3E",
            'exclamation-triangle': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z'/%3E%3C/svg%3E",
            'information-circle': "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'/%3E%3C/svg%3E"
        };
        
        iconSpan.style.backgroundImage = `url("${svgIcons[iconClass]}")`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.style.cssText = `
            vertical-align: middle;
            line-height: 1.4;
        `;
        
        notification.appendChild(iconSpan);
        notification.appendChild(messageSpan);

        // Add click to dismiss and hover effects
        notification.addEventListener('click', () => {
            this.hide(id);
        });
        
        notification.addEventListener('mouseenter', () => {
            notification.style.transform = 'translateX(0) scale(1.02)';
            notification.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
        });
        
        notification.addEventListener('mouseleave', () => {
            notification.style.transform = 'translateX(0) scale(1)';
            notification.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)';
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