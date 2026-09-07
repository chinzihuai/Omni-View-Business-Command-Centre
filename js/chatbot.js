// CAPT EMPIRE AI CHATBOT

document.addEventListener('DOMContentLoaded', () => {
    createChatbot();
});

// CREATE CHATBOT HTML

function createChatbot() {
    // Chat button

    const chatButton = document.createElement('button');

    chatButton.id = 'aiChatButton';

    chatButton.innerHTML = '🤖';

    chatButton.title = 'AI Assistant';

    // Chat window

    const chatWindow = document.createElement('div');

    chatWindow.id = 'aiChatWindow';

    chatWindow.innerHTML = `

        <div class="ai-chat-header">

            <div class="ai-chat-title">

                <span class="ai-chat-title-icon">
                    🤖
                </span>

                <span>
                    CAPT AI Assistant
                </span>

            </div>

            <button id="aiChatClose">
                ×
            </button>

        </div>


        <div id="aiChatMessages">

            <div class="ai-message ai"> 
                <div class="ai-message-content">Hello! 👋<br><br>I'm your CAPT Empire AI assistant.<br><br>Ask me about your sales, live sessions, views, working hours or payouts.</div>
            </div>

        </div>


        <div class="ai-chat-input-area">

            <input
                type="text"
                id="aiChatInput"
                placeholder="Ask something..."
                autocomplete="off"
            >

            <button id="aiChatSend">
                ➤
            </button>

        </div>

    `;

    document.body.appendChild(chatButton);

    document.body.appendChild(chatWindow);

    // Events

    chatButton.addEventListener('click', () => {
        const isOpen = chatWindow.style.display === 'flex';

        if (isOpen) {
            chatWindow.style.display = 'none';
        } else {
            chatWindow.style.display = 'flex';

            document.getElementById('aiChatInput').focus();
        }
    });

    document.getElementById('aiChatClose').addEventListener('click', () => {
        chatWindow.style.display = 'none';
    });

    document
        .getElementById('aiChatSend')
        .addEventListener('click', sendChatMessage);

    document
        .getElementById('aiChatInput')
        .addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();

                sendChatMessage();
            }
        });
}

// SEND MESSAGE

async function sendChatMessage() {
    const input = document.getElementById('aiChatInput');

    const sendButton = document.getElementById('aiChatSend');

    const message = input.value.trim();

    if (!message) {
        return;
    }

    // Show user's message

    addChatMessage(message, 'user');

    input.value = '';

    sendButton.disabled = true;

    // Show typing indicator

    const typingMessage = addTypingMessage();

    try {
        // Get Supabase session

        const {
            data: { session },
            error: sessionError,
        } = await supabaseClient.auth.getSession();

        if (sessionError || !session) {
            removeMessage(typingMessage);

            addChatMessage(
                'Your session has expired. Please log in again.',
                'ai'
            );

            return;
        }

        // Send to backend

        const response = await fetch(
            'https://omni-view-business-command-centre.onrender.com/api/chat',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',

                    Authorization: `Bearer ${session.access_token}`,
                },

                body: JSON.stringify({
                    message: message,
                }),
            }
        );

        const data = await response.json();

        // Remove typing

        removeMessage(typingMessage);

        // Check response

        if (!data.success) {
            addChatMessage(data.error || 'Sorry, something went wrong.', 'ai');

            return;
        }

        // Show AI response

        addChatMessage(data.answer, 'ai');
    } catch (error) {
        console.error('Chatbot error:', error);

        removeMessage(typingMessage);

        addChatMessage('Unable to connect to the AI server.', 'ai');
    } finally {
        sendButton.disabled = false;

        input.focus();
    }
}

// ADD MESSAGE

function addChatMessage(message, sender) {
    const container = document.getElementById('aiChatMessages');

    const messageWrapper = document.createElement('div');

    messageWrapper.className = `ai-message ${sender}`;

    const messageContent = document.createElement('div');

    messageContent.className = 'ai-message-content';

    messageContent.textContent = message;

    messageWrapper.appendChild(messageContent);

    container.appendChild(messageWrapper);

    // Scroll to bottom

    container.scrollTop = container.scrollHeight;

    return messageWrapper;
}

// TYPING INDICATOR

function addTypingMessage() {
    const container = document.getElementById('aiChatMessages');

    const wrapper = document.createElement('div');

    wrapper.className = 'ai-message ai typing-message';

    wrapper.innerHTML = `
        <div class="ai-message-content typing-content">
            <div class="ai-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    container.appendChild(wrapper);

    container.scrollTop = container.scrollHeight;

    return wrapper;
}

// REMOVE MESSAGE

function removeMessage(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}
