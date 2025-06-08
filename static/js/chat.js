/**
 * Professional Chat Interface JavaScript
 * Handles real-time messaging, UI interactions, and error handling
 */

class ChatInterface {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatForm = document.getElementById('chatForm');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.charCounter = document.getElementById('charCounter');
        // Ensure Bootstrap is loaded before initializing Modal
        this.errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
        this.retryButton = document.getElementById('retryButton');
        
        this.isLoading = false;
        this.lastMessage = '';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkHealth();
        this.focusInput();
    }
    
    bindEvents() {
        // Form submission
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Input events
        this.messageInput.addEventListener('input', () => {
            this.updateSendButton();
            this.updateCharCounter();
        });
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Retry button
        this.retryButton.addEventListener('click', () => {
            this.errorModal.hide();
            if (this.lastMessage) {
                this.sendChatMessage(this.lastMessage);
            }
        });
        
        // Auto-resize input on mobile
        window.addEventListener('resize', () => {
            this.scrollToBottom();
        });
    }
    
    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.isLoading;
    }
    
    updateCharCounter() {
        const currentLength = this.messageInput.value.length;
        const maxLength = this.messageInput.getAttribute('maxlength');
        this.charCounter.textContent = `${currentLength}/${maxLength}`;
        
        // Change color based on usage
        if (currentLength > maxLength * 0.9) {
            this.charCounter.className = 'text-warning';
        } else if (currentLength > maxLength * 0.8) {
            this.charCounter.className = 'text-info';
        } else {
            this.charCounter.className = 'text-muted';
        }
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isLoading) {
            return;
        }
        
        // Clear input immediately
        this.messageInput.value = '';
        this.updateSendButton();
        this.updateCharCounter();
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Send to backend
        await this.sendChatMessage(message);
    }
    
    async sendChatMessage(message) {
        this.lastMessage = message;
        this.setLoading(true);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Add bot response
            this.addMessage(data.response, 'bot');
            this.updateStatus('online');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.handleError(error.message);
        } finally {
            this.setLoading(false);
        }
    }
    
    addMessage(text, sender) {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message-wrapper ${sender}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageWrapper.innerHTML = `
            <div class="message-bubble ${sender}">
                <div class="message-content">
                    <p>${this.escapeHtml(text)}</p>
                    <small class="message-time">${timestamp}</small>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageWrapper);
        this.scrollToBottom();
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.updateSendButton();
        
        if (loading) {
            this.showTypingIndicator();
            this.messageInput.disabled = true;
        } else {
            this.hideTypingIndicator();
            this.messageInput.disabled = false;
            this.focusInput();
        }
    }
    
    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.typingIndicator.classList.add('show');
    }
    
    hideTypingIndicator() {
        this.typingIndicator.classList.remove('show');
        setTimeout(() => {
            this.typingIndicator.style.display = 'none';
        }, 300);
    }
    
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        });
    }
    
    focusInput() {
        if (window.innerWidth > 768) { // Don't auto-focus on mobile
            this.messageInput.focus();
        }
    }
    
    updateStatus(status) {
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        
        switch (status) {
            case 'online':
                statusDot.className = 'status-dot bg-success';
                this.statusText.textContent = 'Online';
                break;
            case 'error':
                statusDot.className = 'status-dot bg-danger';
                this.statusText.textContent = 'Error';
                break;
            case 'connecting':
                statusDot.className = 'status-dot bg-warning';
                this.statusText.textContent = 'Connecting...';
                break;
        }
    }
    
    handleError(message) {
        this.updateStatus('error');
        
        // Add error message to chat
        this.addErrorMessage(message);
        
        // Show error modal for detailed error
        document.getElementById('errorMessage').textContent = message;
        this.errorModal.show();
    }
    
    addErrorMessage(error) {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = 'message-wrapper bot-message';
        
        const timestamp = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageWrapper.innerHTML = `
            <div class="message-bubble bot error">
                <div class="message-content">
                    <p><i class="bi bi-exclamation-triangle me-1"></i>Sorry, I encountered an error: ${this.escapeHtml(error)}</p>
                    <small class="message-time">${timestamp}</small>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageWrapper);
        this.scrollToBottom();
    }
    
    async checkHealth() {
        try {
            this.updateStatus('connecting');
            
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.updateStatus('online');
            } else {
                this.updateStatus('error');
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.updateStatus('error');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatInterface = new ChatInterface();
});

// Add some additional utility functions
window.addEventListener('beforeunload', () => {
    // Clean up any ongoing requests
    if (window.chatInterface && window.chatInterface.isLoading) {
        // Cancel any pending requests if needed
    }
});

// Handle online/offline events
window.addEventListener('online', () => {
    if (window.chatInterface) {
        window.chatInterface.checkHealth();
    }
});

window.addEventListener('offline', () => {
    if (window.chatInterface) {
        window.chatInterface.updateStatus('error');
    }
});