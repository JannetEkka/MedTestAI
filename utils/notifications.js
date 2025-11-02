// utils/notifications.js
class NotificationManager {
  static show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-icon">${this.getIcon(type)}</div>
      <div class="notification-message">${message}</div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('notification-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  static getIcon(type) {
    const icons = {
      success: 'âœ…',
      error: 'âŒ',
      warning: 'âš ï¸',
      info: 'âžï¸'
    };
    return icons[type] || icons.info;
  }

  static success(message, duration) {
    this.show(message, 'success', duration);
  }

  static error(message, duration) {
    this.show(message, 'error', duration);
  }

  static warning(message, duration) {
    this.show(message, 'warning', duration);
  }

  static info(message, duration) {
    this.show(message, 'info', duration);
  }
}

export default NotificationManager; 