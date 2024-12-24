class ChatApp {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.apiKey = 'app-7BDgTOmgbJZrzGWIQ8OjFZ6Y';
        this.baseUrl = 'https://mify-be.pt.xiaomi.com/api/v1';
        this.fileInput = document.getElementById('fileInput');
        this.uploadButton = document.getElementById('uploadButton');
        this.attachmentPreview = document.getElementById('attachmentPreview');
        this.currentUploadedFile = null;
        this.lastMessageId = null;  // 添加这一行
        this.conversationItems = document.getElementById('conversationItems');
        this.currentConversationId = '';
        this.firstMessageId = null;
        this.hasMore = true;
        this.isLoadingHistory = false;
        this.welcomePage = document.getElementById('welcomePage');
        this.chatContainer = document.getElementById('chatContainer');
        this.newChatButton = document.getElementById('newChatButton');
        this.toggleSidebarButton = document.getElementById('toggleSidebarButton');
        this.sidebar = document.querySelector('.sidebar');
        this.menuButton = document.getElementById('menuButton');
        this.overlay = document.getElementById('overlay');
        this.mainContent = document.querySelector('.main-content');
        this.isMobile = window.innerWidth <= 768;
        this.showSidebarButton = document.getElementById('showSidebarButton');
        this.welcomeUserInput = document.getElementById('welcomeUserInput');
        this.welcomeSendButton = document.getElementById('welcomeSendButton');
        this.welcomeUploadButton = document.getElementById('welcomeUploadButton');
        this.welcomeFileInput = document.getElementById('welcomeFileInput');
        this.welcomeAttachmentPreview = document.getElementById('welcomeAttachmentPreview');
        this.initialized = false;
        this.user = 'web-user';
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsPage = document.getElementById('settingsPage');
        this.settingsForm = document.getElementById('settingsForm');
        this.currentTheme = localStorage.getItem('theme') || 'default';
        this.userName = localStorage.getItem('userName') || '未设置用户名';
        this.userAvatar = document.getElementById('userAvatar');
        this.userNameDisplay = document.getElementById('userName');
        
        this.loadSettings();
        // 初始化设置相关的事件监听
        this.initSettingsHandlers();
        this.init();
        
        // 配置 marked
        this.configureMarked();
    }

    configureMarked() {
        // 配置 marked 选项
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
        });

        // 自定义渲染器
        const renderer = new marked.Renderer();
        
        // 自定义代码块渲染
        renderer.code = (code, language) => {
            const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
            const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;
            
            return `
                <pre><div class="code-toolbar">
                    <button class="copy-button" onclick="chatApp.copyCode(this, \`${code.replace(/`/g, '\\`')}\`)">复制代码</button>
                </div><code class="language-${validLanguage}">${highlightedCode}</code></pre>
            `;
        };

        marked.use({ renderer });
    }

    copyCode(button, code) {
        navigator.clipboard.writeText(code).then(() => {
            button.textContent = '已复制';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = '复制代码';
                button.classList.remove('copied');
            }, 2000);
        });
    }

    async init() {
        // 先绑定事件监听器
        this.bindEventListeners();
        
        // 立即加载历史对话
        await this.loadConversations();
        
        // 标记初始化完成
        this.initialized = true;
    }

    bindEventListeners() {
        // 将原来init中的事件绑定移到这个新方法中
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.uploadButton.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        
        // 添加新对话按钮事件
        this.newChatButton.addEventListener('click', () => this.startNewChat());
        
        // 添加侧边栏切换按钮事件
        this.toggleSidebarButton.addEventListener('click', () => this.toggleSidebar());
        
        // 添加示例建议点击事件
        document.querySelectorAll('.welcome-suggestion-items button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.startNewChat(e.target.textContent.replace(/["]/g, ''));
            });
        });
        
        // 添加移动端侧边栏控制
        this.menuButton.addEventListener('click', () => this.toggleMobileSidebar());
        this.overlay.addEventListener('click', () => this.toggleMobileSidebar());
        
        // 添加窗口大小变化监听
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this.updateSidebarState();
        });
        
        // 在移动端点击对话项后自动隐藏侧边栏
        this.conversationItems.addEventListener('click', () => {
            if (this.isMobile) {
                this.toggleMobileSidebar();
            }
        });

        // 添加显示侧边栏按钮事件
        this.showSidebarButton.addEventListener('click', () => this.showSidebar());
        
        // 欢迎页面输入框事件
        this.welcomeSendButton.addEventListener('click', () => this.sendWelcomeMessage());
        this.welcomeUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendWelcomeMessage();
            }
        });
        this.welcomeUploadButton.addEventListener('click', () => this.welcomeFileInput.click());
        this.welcomeFileInput.addEventListener('change', (e) => this.handleWelcomeFileSelect(e));
    }

    appendMessage(content, isUser = false, parent = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'} new`;
        
        // 添加头像
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        if (isUser) {
            avatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${this.userName}`;  // 用户默认头像
            messageDiv.setAttribute('data-user', this.userName);
        } else {
            avatar.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=bot';  // 机器人默认头像
        }
        messageDiv.appendChild(avatar);
        
        // 创建一个包装器来包含消息内容和建议
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (isUser) {
            messageContent.textContent = content;
        } else {
            messageContent.innerHTML = content ? marked.parse(content) : '';
        }
        
        contentWrapper.appendChild(messageContent);
        
        // 为机器人消息添加建议容器
        if (!isUser) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'suggestions-container';
            contentWrapper.appendChild(suggestionsContainer);
        }
        
        messageDiv.appendChild(contentWrapper);
        
        // 添加时间戳
        const time = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        messageDiv.setAttribute('data-time', time);
        
        if (parent) {
            parent.appendChild(messageDiv);
        } else {
            this.chatMessages.appendChild(messageDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
        
        setTimeout(() => {
            messageDiv.classList.remove('new');
        }, 500);
        
        return messageDiv;
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('user', this.user);

            const response = await fetch(`${this.baseUrl}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            const result = await response.json();
            if (result.id) {
                this.currentUploadedFile = {
                    id: result.id,
                    name: result.name
                };
                this.showPreview(file);
            }
        } catch (error) {
            console.error('上传文件失败:', error);
            alert('文件上传失败，请重试');
        }
    }

    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.attachmentPreview.innerHTML = `
                <div class="preview-image">
                    <img src="${e.target.result}" alt="预览">
                    <button class="remove-button" onclick="chatApp.removeAttachment()">×</button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }

    removeAttachment() {
        this.attachmentPreview.innerHTML = '';
        this.currentUploadedFile = null;
        this.fileInput.value = '';
    }

    async loadSuggestions(messageDiv) {
        if (!this.lastMessageId) return;
        
        try {
            const response = await fetch(
                `${this.baseUrl}/messages/${this.lastMessageId}/suggested?user=${this.user}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();
            if (data.result === 'success' && data.data) {
                const suggestionsContainer = messageDiv.querySelector('.suggestions-container');
                suggestionsContainer.innerHTML = ''; // 清除现有建议

                data.data.forEach(suggestion => {
                    const btn = document.createElement('button');
                    btn.className = 'suggestion-item';
                    btn.textContent = suggestion;
                    btn.addEventListener('click', () => {
                        this.userInput.value = suggestion;
                        this.sendMessage();
                    });
                    suggestionsContainer.appendChild(btn);
                });
                
                // 滚动到建议列表可见
                setTimeout(() => {
                    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            }
        } catch (error) {
            console.error('获取建议失败:', error);
        }
    }

    clearAllSuggestions() {
        const allSuggestions = document.querySelectorAll('.suggestions-container');
        allSuggestions.forEach(container => {
            container.innerHTML = '';
        });
    }

    async sendMessage() {
        
        // 隐藏欢迎页面，显示聊天界面
        this.welcomePage.style.display = 'none';
        this.chatContainer.style.display = 'flex';
        if (!this.initialized) return;
        
        // 清除所有现有建议
        this.clearAllSuggestions();
        
        const message = this.userInput.value.trim();
        if (!message && !this.currentUploadedFile) return;

        // 显示用户消息
        this.appendMessage(message, true);
        this.userInput.value = '';

        // 准备发送数据
        const sendData = {
            query: message,
            response_mode: 'streaming',
            conversation_id: this.currentConversationId,
            user: this.user,
            inputs: {}
        };

        // 如果有附件，添加到发送数据中
        if (this.currentUploadedFile) {
            sendData.files = [{
                type: 'image',
                transfer_method: 'local_file',
                upload_file_id: this.currentUploadedFile.id
            }];
            this.removeAttachment();
        }

        // 创建机器人响应的消息容器
        const botMessageDiv = this.appendMessage('', false);
        // 添加加载状态，但保持位置固定
        botMessageDiv.classList.add('loading');
        botMessageDiv.style.alignSelf = 'flex-start';
        let fullResponse = '';

        try {
            const response = await fetch(`${this.baseUrl}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sendData)
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let messageFiles = [];
            
            while (true) {
                const {done, value} = await reader.read();
                if (done) {
                    // 移除加载状态，保持位置
                    botMessageDiv.classList.remove('loading');
                    const finalContent = marked.parse(fullResponse);
                    botMessageDiv.querySelector('.message-content').innerHTML = finalContent;
                    await this.loadSuggestions(botMessageDiv);
                    break;
                }
                
                // 添加打字机效果
                botMessageDiv.classList.add('typing');
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            switch (data.event) {
                                case 'message':
                                    fullResponse += data.answer;
                                    const formattedContent = marked.parse(fullResponse);
                                    botMessageDiv.querySelector('.message-content').innerHTML = formattedContent;
                                    this.lastMessageId = data.message_id;
                                    this.currentConversationId = data.conversation_id;
                                    // 滚动到建议列表可见
                                    botMessageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    break;

                                case 'agent_thought':
                                    if (data.thought) {
                                        thought = data.thought;
                                    }
                                    if (data.tool && data.tool_input) {
                                        const toolContent = `\n\n**Using ${data.tool}:**\n\`\`\`json\n${data.tool_input}\n\`\`\`\n\n`;
                                        fullResponse += toolContent;
                                    }
                                    if (data.observation) {
                                        fullResponse += `\n\n**Observation:** ${data.observation}\n\n`;
                                    }
                                    if (data.message_files) {
                                        messageFiles = messageFiles.concat(data.message_files);
                                    }
                                    break;

                                case 'message_file':
                                    if (data.type === 'image') {
                                        const imageHtml = `\n\n![Generated Image](${data.url})\n\n`;
                                        fullResponse += imageHtml;
                                    }
                                    break;

                                case 'tts_message':
                                    if (data.audio) {
                                        // 处理文本转语音
                                        this.playAudio(data.audio);
                                    }
                                    break;
                            }
                            
                            // 更新消息内容
                            const formattedContent = marked.parse(fullResponse);
                            botMessageDiv.querySelector('.message-content').innerHTML = formattedContent;
                        } catch (e) {
                            console.error('解析响应数据失败:', e);
                        }
                    }
                }
            }
        } catch (error) {
            botMessageDiv.classList.remove('loading');
            // ...rest of error handling...
            console.error('发送消息失败:', error);
            botMessageDiv.querySelector('.message-content').textContent = '抱歉，发生了错误。请稍后重试。';
        }
        this.textToAudio(this.lastMessageId);
        
        await this.loadConversations();

        // 在消息发送时隐藏欢迎页面
        this.welcomePage.style.display = 'none';
        this.chatContainer.style.display = 'flex';
    }

      arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async loadConversations() {
        try {
            // 显示加载状态
            this.conversationItems.innerHTML = '<div class="loading">加载中...</div>';
            const response = await fetch(
                `${this.baseUrl}/conversations?user=${this.user}&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();
            
            // 清除加载状态
            this.conversationItems.innerHTML = '';
            
            if (data.data && data.data.length > 0) {
                this.renderConversations(data.data);
                this.hasMore = data.has_more;
            } else {
                // 没有历史对话时显示提示
                this.conversationItems.innerHTML = '<div class="no-conversations">暂无历史对话</div>';
            }
        } catch (error) {
            console.error('加载对话列表失败:', error);
            this.conversationItems.innerHTML = '<div class="error">加载失败，请刷新重试</div>';
        }
    }

    renderConversations(messages) {
        this.conversationItems.innerHTML = ''; // 清除现有列表
        messages.forEach(message => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.conversationId = message.id;

            const time = new Date(message.created_at * 1000).toLocaleString();
            item.innerHTML = `
                <div class="conversation-content">
                    <div>${message.name}</div>
                    <div class="time">${time}</div>
                </div>
                <button class="delete-btn" title="删除会话">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            // 给删除按钮添加事件监听
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                this.deleteConversation(message.id);
            });

            // 给会话项添加点击事件
            item.querySelector('.conversation-content').addEventListener('click', () => {
                this.switchConversation(message.id);
            });

            this.conversationItems.appendChild(item);
        });
    }

    async deleteConversation(conversationId) {
        if (!confirm('确定要删除这个会话吗？')) return;

        try {
            const response = await fetch(
                `${this.baseUrl}/conversations/${conversationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user: this.user })
                }
            );

            const data = await response.json();
            if (data.result === 'success') {
                // 如果删除的是当前会话，重置状态并显示欢迎页面
                if (conversationId === this.currentConversationId) {
                    this.currentConversationId = '';
                    this.firstMessageId = null;
                    this.lastMessageId = null;
                    this.chatMessages.innerHTML = '';
                    this.welcomePage.style.display = 'flex';
                    this.chatContainer.style.display = 'none';
                }
                // 重新加载会话列表
                await this.loadConversations();
            }
        } catch (error) {
            console.error('删除会话失败:', error);
            alert('删除会话失败，请重试');
        }
    }
    async audioToText(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('user', this.user);

            const response = await fetch(`${this.baseUrl}/audio-to-text`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            const result = await response.json();
            if (result.result === 'success') {
                return result.text;
            } else {
                throw new Error('Audio to text conversion failed');
            }
        } catch (error) {
            console.error('音频转文字失败:', error);
            throw error;
        }
    }

    async textToAudio(messageId) {
        try {
            const requestBody = {
                user: this.user,
                message_id: messageId
            };

            const response = await fetch(
            `${this.baseUrl}/text-to-audio`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            this.playAudio(await response.arrayBuffer());
        } catch (error) {
            console.error('文字转语音失败:', error);
        }
    }

    playAudio(audioData) {
        try {
            // 将字节码转换为 Base64 字符串
            const base64String = this.arrayBufferToBase64(audioData);
      
            const audio = new Audio();
            audio.src = `data:audio/mpeg;base64,${base64String}`;
      
            audio.addEventListener('error', (e) => {
                console.error('音频加载失败:', e.target.error);
            });
      
            return audio.play().catch((error) => {
                console.error('播放音频失败:', error);
                // 尝试使用备用音频格式 (WAV)
                audio.src = `data:audio/wav;base64,${base64String}`;
                return audio.play();
            });
        } catch (error) {
            console.error('音频初始化失败:', error);
        }
    }

    async switchConversation(conversationId) {
        if (conversationId === this.currentConversationId) return;
        
        this.currentConversationId = conversationId;
        this.firstMessageId = null;
        this.hasMore = true;
        this.chatMessages.innerHTML = '';
        await this.loadMoreMessages();
        
        // 更新选中状态
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.conversationId === conversationId) {
                item.classList.add('active');
            }
        });
        
        // 确保切换到聊天界面
        this.welcomePage.style.display = 'none';
        this.chatContainer.style.display = 'flex';
    }

    async loadMoreMessages() {
        if (this.isLoadingHistory) return;
        this.isLoadingHistory = true;

        try {
            const url = new URL(`${this.baseUrl}/messages`);
            const params = {
                user: this.user,
                conversation_id: this.currentConversationId,
                limit: '100'
            };
            if (this.firstMessageId) {
                params.first_id = this.firstMessageId;
            }
            url.search = new URLSearchParams(params).toString();

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            this.hasMore = data.has_more;
            
            if (data.data.length > 0) {
                this.firstMessageId = data.data[0].id;
                this.renderHistoryMessages(data.data);
            }
        } catch (error) {
            console.error('加载历史消息失败:', error);
        } finally {
            this.isLoadingHistory = false;
        }
    }

    renderHistoryMessages(messages) {
        const fragment = document.createDocumentFragment();
        messages.forEach(message => {
            // 创建AI响应消息并使用 Markdown 渲染
            if (message.answer) {
                const userDiv = this.appendMessage(message.query, true, fragment);
                userDiv.querySelector('.message-content').innerHTML = marked.parse(message.query);
                const botDiv = this.appendMessage(message.answer, false, fragment);
                botDiv.querySelector('.message-content').innerHTML = marked.parse(message.answer);
            }
        });
        
        // 在现有消息前插入历史消息
        this.chatMessages.insertBefore(fragment, this.chatMessages.firstChild);
    }
    
    startNewChat(initialMessage = '') {
        this.currentConversationId = '';
        this.firstMessageId = null;
        this.lastMessageId = null;
        this.chatMessages.innerHTML = '';
        
        this.welcomePage.style.display = 'flex';
        this.chatContainer.style.display = 'flex';
        
        // 如果有初始消息，则自动发送
        if (initialMessage) {
            this.userInput.value = initialMessage;
            this.sendMessage();
        }
    }

    toggleMobileSidebar() {
        this.sidebar.classList.toggle('mobile-visible');
        this.overlay.classList.toggle('visible');
    }

    toggleSidebar() {
        if (this.isMobile) {
            this.toggleMobileSidebar();
        } else {
            this.sidebar.classList.toggle('collapsed');
            this.mainContent.classList.toggle('sidebar-collapsed');
            this.showSidebarButton.classList.toggle('visible');
        }
    }

    showSidebar() {
        this.sidebar.classList.remove('collapsed');
        this.mainContent.classList.remove('sidebar-collapsed');
        this.showSidebarButton.classList.remove('visible');
    }

    updateSidebarState() {
        if (!this.isMobile) {
            this.sidebar.classList.remove('mobile-visible');
            this.overlay.classList.remove('visible');
        }
    }

    sendWelcomeMessage() {
        const message = this.welcomeUserInput.value.trim();
        if (!message && !this.currentUploadedFile) return;
        
        this.startNewChat();
        this.userInput.value = message;
        this.sendMessage();
    }

    handleWelcomeFileSelect(event) {
        // 复用现有的文件处理逻辑
        this.handleFileSelect(event);
        // 更新预览容器
        this.attachmentPreview = this.welcomeAttachmentPreview;
    }

    loadSettings() {
        // 从 localStorage 加载配置，如果没有则使用默认值
        this.apiKey = localStorage.getItem('apiKey') || 'app-7BDgTOmgbJZrzGWIQ8OjFZ6Y';
        this.baseUrl = localStorage.getItem('baseUrl') || 'https://mify-be.pt.xiaomi.com/api/v1';
        this.user = localStorage.getItem('userId') || 'chat-app';
        document.getElementById('userNameInput').value = this.userName;
        this.applyTheme(this.currentTheme);
        this.updateUserInfo();

        // 更新表单值
        document.getElementById('apiKey').value = this.apiKey;
        document.getElementById('baseUrl').value = this.baseUrl;
        document.getElementById('userId').value = this.user;
        
        // 确保主题选择器正确显示当前主题
        const savedTheme = localStorage.getItem('theme') || 'default';
        this.applyTheme(savedTheme);
    }

    initSettingsHandlers() {
        // 设置按钮点击事件
        this.settingsButton.addEventListener('click', () => {
            this.toggleSettingsPage();
        });

        // 设置表单提交事件
        this.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
            this.loadConversations();
        });

        // 添加主题选择器事件监听
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                document.querySelectorAll('.theme-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.target.classList.add('active');
                this.applyTheme(theme);
            });
        });
        
        // 更新主题选择器事件监听
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.applyTheme(theme);
            });
        });
    }

    applyTheme(theme) {
        const root = document.documentElement;
        const themeColors = {
            default: 'var(--theme-color-default)',
            blue: 'var(--theme-color-blue)',
            purple: 'var(--theme-color-purple)',
            red: 'var(--theme-color-red)',
            orange: 'var(--theme-color-orange)',
            green: 'var(--theme-color-green)'
        };
        
        root.style.setProperty('--primary-color', themeColors[theme]);
        
        // 更新主题选择器的激活状态
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });
        
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
    }

    updateUserInfo() {
        this.userNameDisplay.textContent = this.userName;
        this.userAvatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${this.userName}`;
    }

    saveSettings() {
        const newUserName = document.getElementById('userNameInput').value.trim();
        
        if (newUserName) {
            this.userName = newUserName;
            localStorage.setItem('userName', newUserName);
            this.updateUserInfo();
        }
        
        // 保存主题设置
        localStorage.setItem('theme', this.currentTheme);

        const newApiKey = document.getElementById('apiKey').value.trim();
        const newBaseUrl = document.getElementById('baseUrl').value.trim();
        const newUserId = document.getElementById('userId').value.trim();

        if (!newApiKey || !newBaseUrl || !newUserId) {
            alert('所有字段都必须填写');
            return;
        }

        // 保存到 localStorage
        localStorage.setItem('apiKey', newApiKey);
        localStorage.setItem('baseUrl', newBaseUrl);
        localStorage.setItem('userId', newUserId);

        // 更新实例变量
        this.apiKey = newApiKey;
        this.baseUrl = newBaseUrl;
        this.user = newUserId;

        alert('设置已保存');
        this.chatContainer.style.display = 'none';
        this.welcomePage.style.display = 'flex';
        this.settingsPage.style.display = 'none';
    }

    toggleSettingsPage() {
        // 获取当前显示状态
        const isSettingsVisible = this.settingsPage.style.display === 'flex';
        
        // 先隐藏所有页面
        this.chatContainer.style.display = 'none';
        this.welcomePage.style.display = 'none';
        this.settingsPage.style.display = 'none';
        
        if (!isSettingsVisible) {
            // 显示设置页面
            this.settingsPage.style.display = 'flex';
            // 加载设置
            this.loadSettings();
            
            // 更新主题选择器的激活状态
            document.querySelectorAll('.theme-option').forEach(option => {
                option.classList.toggle('active', option.dataset.theme === this.currentTheme);
            });
        }else{
            // 显示欢迎页面
            this.welcomePage.style.display = 'flex';
        }
    }
}

// 初始化应用并使其全局可用（为了处理预览图片的删除）
let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApp();
});
