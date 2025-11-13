/**
 * Toast Notification System
 * Modern, non-blocking notifications for user feedback
 */

// Create toast container if it doesn't exist
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  initToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const colors = {
    success: { bg: '#10b981', border: '#059669' },
    error: { bg: '#ef4444', border: '#dc2626' },
    info: { bg: '#3b82f6', border: '#2563eb' },
    warning: { bg: '#f59e0b', border: '#d97706' }
  };
  
  const color = colors[type] || colors.info;
  
  toast.style.cssText = `
    background: ${color.bg};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    border-left: 4px solid ${color.border};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    line-height: 1.5;
    max-width: 100%;
    word-wrap: break-word;
    animation: slideIn 0.3s ease-out;
    cursor: pointer;
  `;
  
  toast.textContent = message;
  
  // Add animation keyframes if not exists
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  const container = document.getElementById('toast-container');
  container.appendChild(toast);
  
  // Click to dismiss
  toast.addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  });
  
  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }
}

// Export to global scope
window.showToast = showToast;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showToast };
}
