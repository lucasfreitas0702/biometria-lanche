// Estado da aplicação
class AppState {
    constructor() {
        this.currentPassword = '';
        this.registerPassword = '';
        this.selectedImage = null;
        this.biometricCredential = null;
        this.currentScreen = 'main';
        this.users = this.loadUsers();
    }

    // Carregar usuários do localStorage
    loadUsers() {
        try {
            const stored = localStorage.getItem('biometric_users');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            return [];
        }
    }

    // Salvar usuários no localStorage
    saveUsers() {
        try {
            localStorage.setItem('biometric_users', JSON.stringify(this.users));
        } catch (error) {
            console.error('Erro ao salvar usuários:', error);
        }
    }

    // Verificar se senha já existe
    passwordExists(password) {
        return this.users.some(user => user.password === password);
    }

    // Adicionar novo usuário
    addUser(userData) {
        this.users.push(userData);
        this.saveUsers();
    }

    // Encontrar usuário por senha
    findUserByPassword(password) {
        return this.users.find(user => user.password === password);
    }
}

// Instância global do estado
const appState = new AppState();

// Elementos DOM
const elements = {
    // Telas
    mainScreen: document.getElementById('main-screen'),
    registerScreen: document.getElementById('register-screen'),
    
    // Displays de senha
    passwordDots: document.getElementById('password-dots'),
    registerPasswordDots: document.getElementById('register-password-dots'),
    
    // Botões
    registerBtn: document.getElementById('register-btn'),
    backBtn: document.getElementById('back-btn'),
    biometricBtn: document.getElementById('biometric-btn'),
    saveUserBtn: document.getElementById('save-user-btn'),
    
    // Upload de imagem
    imageInput: document.getElementById('image-input'),
    uploadArea: document.getElementById('upload-area'),
    imagePreview: document.getElementById('image-preview'),
    
    // Status biométrico
    biometricStatus: document.getElementById('biometric-status'),
    
    // Modais
    imageModal: document.getElementById('image-modal'),
    loadingModal: document.getElementById('loading-modal'),
    messageModal: document.getElementById('message-modal'),
    modalImage: document.getElementById('modal-image'),
    timerText: document.getElementById('timer-text'),
    loadingText: document.getElementById('loading-text'),
    messageIcon: document.getElementById('message-icon'),
    messageTitle: document.getElementById('message-title'),
    messageText: document.getElementById('message-text'),
    messageOkBtn: document.getElementById('message-ok-btn')
};

// Utilitários
const utils = {
    // Mostrar loading
    showLoading(text = 'Processando...') {
        elements.loadingText.textContent = text;
        elements.loadingModal.classList.add('active');
    },

    // Esconder loading
    hideLoading() {
        elements.loadingModal.classList.remove('active');
    },

    // Mostrar mensagem
    showMessage(title, text, icon = '✓') {
        elements.messageIcon.textContent = icon;
        elements.messageTitle.textContent = title;
        elements.messageText.textContent = text;
        elements.messageModal.classList.add('active');
    },

    // Esconder mensagem
    hideMessage() {
        elements.messageModal.classList.remove('active');
    },

    // Mostrar imagem por tempo determinado
    showImageTimer(imageSrc, seconds = 4) {
        elements.modalImage.src = imageSrc;
        elements.timerText.textContent = seconds;
        elements.imageModal.classList.add('active');

        let timeLeft = seconds;
        const timer = setInterval(() => {
            timeLeft--;
            elements.timerText.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                elements.imageModal.classList.remove('active');
                // Voltar para tela principal
                switchScreen('main');
                appState.currentPassword = '';
                updatePasswordDisplay();
            }
        }, 1000);
    },

    // Converter arquivo para base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Validar formato de imagem
    isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    }
};

// Gerenciamento de telas
function switchScreen(screenName) {
    // Esconder todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar tela solicitada
    if (screenName === 'main') {
        elements.mainScreen.classList.add('active');
        appState.currentScreen = 'main';
    } else if (screenName === 'register') {
        elements.registerScreen.classList.add('active');
        appState.currentScreen = 'register';
        checkBiometricAvailability();
    }
}

// Atualizar display de senha
function updatePasswordDisplay() {
    const password = appState.currentScreen === 'main' ? appState.currentPassword : appState.registerPassword;
    const container = appState.currentScreen === 'main' ? elements.passwordDots : elements.registerPasswordDots;
    
    container.innerHTML = '';
    
    for (let i = 0; i < password.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'password-dot';
        container.appendChild(dot);
    }
}

// Manipular entrada do teclado
function handleKeypadInput(value) {
    if (value === 'clear') {
        if (appState.currentScreen === 'main') {
            appState.currentPassword = '';
        } else {
            appState.registerPassword = '';
        }
    } else if (value === 'enter') {
        if (appState.currentScreen === 'main') {
            handleLogin();
        } else {
            // No registro, apenas atualizar validação
            validateRegisterForm();
        }
    } else {
        // Adicionar número
        if (appState.currentScreen === 'main') {
            if (appState.currentPassword.length < 10) { // Limite de 10 dígitos
                appState.currentPassword += value;
            }
        } else {
            if (appState.registerPassword.length < 10) { // Limite de 10 dígitos
                appState.registerPassword += value;
            }
        }
    }
    
    updatePasswordDisplay();
    
    if (appState.currentScreen === 'register') {
        validateRegisterForm();
    }
}

// Validar formulário de registro
function validateRegisterForm() {
    const hasPassword = appState.registerPassword.length >= 4; // Mínimo 4 dígitos
    const hasImage = appState.selectedImage !== null;
    const hasBiometric = appState.biometricCredential !== null;
    
    elements.biometricBtn.disabled = !hasPassword || !hasImage;
    elements.saveUserBtn.disabled = !hasPassword || !hasImage || !hasBiometric;
}

// Verificar disponibilidade biométrica
async function checkBiometricAvailability() {
    try {
        const available = await window.webAuthnHelper.checkBiometricAvailability();
        if (!available) {
            elements.biometricStatus.innerHTML = '⚠️ Biometria não disponível neste dispositivo';
            elements.biometricStatus.className = 'biometric-status error';
        }
    } catch (error) {
        console.error('Erro ao verificar biometria:', error);
    }
}

// Registrar biometria
async function registerBiometric() {
    if (!appState.registerPassword || !appState.selectedImage) {
        utils.showMessage('Erro', 'Preencha a senha e selecione uma imagem primeiro', '❌');
        return;
    }

    try {
        utils.showLoading('Registrando biometria...');
        
        const credential = await window.webAuthnHelper.registerCredential(`user_${appState.registerPassword}`);
        appState.biometricCredential = credential;
        
        elements.biometricStatus.innerHTML = '✅ Biometria registrada com sucesso!';
        elements.biometricStatus.className = 'biometric-status success';
        
        validateRegisterForm();
        utils.hideLoading();
        
    } catch (error) {
        utils.hideLoading();
        const errorMessage = window.webAuthnHelper.getErrorMessage(error);
        elements.biometricStatus.innerHTML = `❌ ${errorMessage}`;
        elements.biometricStatus.className = 'biometric-status error';
        console.error('Erro no registro biométrico:', error);
    }
}

// Salvar usuário
async function saveUser() {
    if (!appState.registerPassword || !appState.selectedImage || !appState.biometricCredential) {
        utils.showMessage('Erro', 'Todos os campos são obrigatórios', '❌');
        return;
    }

    // Verificar se senha já existe
    if (appState.passwordExists(appState.registerPassword)) {
        utils.showMessage('Erro', 'Esta senha numérica já está em uso. Escolha outra.', '❌');
        return;
    }

    try {
        utils.showLoading('Salvando usuário...');

        // Preparar dados do usuário
        const userData = {
            id: Date.now().toString(),
            password: appState.registerPassword,
            credentialId: appState.biometricCredential.credentialId,
            publicKey: appState.biometricCredential.publicKey,
            image: appState.selectedImage,
            createdAt: new Date().toISOString()
        };

        // Salvar localmente
        appState.addUser(userData);

        // Também enviar para o servidor (opcional, para backup)
        try {
            const formData = new FormData();
            formData.append('password', appState.registerPassword);
            formData.append('credentialId', appState.biometricCredential.credentialId);
            formData.append('publicKey', appState.biometricCredential.publicKey);
            
            // Converter base64 de volta para blob para envio
            const response = await fetch(appState.selectedImage);
            const blob = await response.blob();
            formData.append('image', blob, 'user_image.jpg');

            await fetch('/api/register', {
                method: 'POST',
                body: formData
            });
        } catch (serverError) {
            console.warn('Erro ao salvar no servidor, mas usuário foi salvo localmente:', serverError);
        }

        utils.hideLoading();
        utils.showMessage('Sucesso!', 'Usuário cadastrado com sucesso!', '✅');

        // Resetar formulário
        appState.registerPassword = '';
        appState.selectedImage = null;
        appState.biometricCredential = null;
        elements.imagePreview.innerHTML = '';
        elements.biometricStatus.innerHTML = '';
        elements.biometricStatus.className = 'biometric-status';
        updatePasswordDisplay();
        validateRegisterForm();

    } catch (error) {
        utils.hideLoading();
        utils.showMessage('Erro', 'Erro ao salvar usuário: ' + error.message, '❌');
        console.error('Erro ao salvar usuário:', error);
    }
}

// Fazer login
async function handleLogin() {
    if (!appState.currentPassword) {
        utils.showMessage('Erro', 'Digite sua senha', '❌');
        return;
    }

    try {
        utils.showLoading('Verificando credenciais...');

        // Buscar usuário pela senha
        const user = appState.findUserByPassword(appState.currentPassword);
        
        if (!user) {
            utils.hideLoading();
            utils.showMessage('Erro', 'Senha incorreta', '❌');
            appState.currentPassword = '';
            updatePasswordDisplay();
            return;
        }

        // Verificar biometria
        try {
            const authResult = await window.webAuthnHelper.authenticateCredential(user.credentialId);
            
            if (authResult.credentialId === user.credentialId) {
                utils.hideLoading();
                // Mostrar imagem por 4 segundos
                utils.showImageTimer(user.image, 4);
            } else {
                throw new Error('Credencial não confere');
            }
            
        } catch (biometricError) {
            utils.hideLoading();
            const errorMessage = window.webAuthnHelper.getErrorMessage(biometricError);
            utils.showMessage('Erro de Biometria', errorMessage, '❌');
            appState.currentPassword = '';
            updatePasswordDisplay();
        }

    } catch (error) {
        utils.hideLoading();
        utils.showMessage('Erro', 'Erro na autenticação: ' + error.message, '❌');
        console.error('Erro no login:', error);
        appState.currentPassword = '';
        updatePasswordDisplay();
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Teclado numérico
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('click', function() {
            const number = this.dataset.number;
            const action = this.dataset.action;
            
            if (number) {
                handleKeypadInput(number);
            } else if (action) {
                handleKeypadInput(action);
            }
        });
    });

    // Navegação
    elements.registerBtn.addEventListener('click', () => switchScreen('register'));
    elements.backBtn.addEventListener('click', () => switchScreen('main'));

    // Upload de imagem
    elements.imageInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!utils.isValidImageFile(file)) {
            utils.showMessage('Erro', 'Por favor, selecione um arquivo de imagem válido', '❌');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            utils.showMessage('Erro', 'Arquivo muito grande. Máximo 5MB', '❌');
            return;
        }

        try {
            const base64 = await utils.fileToBase64(file);
            appState.selectedImage = base64;

            // Mostrar preview
            elements.imagePreview.innerHTML = `
                <img src="${base64}" alt="Preview" class="preview-image">
            `;

            validateRegisterForm();
        } catch (error) {
            utils.showMessage('Erro', 'Erro ao processar imagem', '❌');
            console.error('Erro no upload:', error);
        }
    });

    // Área de upload clicável
    elements.uploadArea.addEventListener('click', () => {
        elements.imageInput.click();
    });

    // Biometria
    elements.biometricBtn.addEventListener('click', registerBiometric);

    // Salvar usuário
    elements.saveUserBtn.addEventListener('click', saveUser);

    // Fechar modais
    elements.messageOkBtn.addEventListener('click', utils.hideMessage);

    // Fechar modal de imagem ao clicar fora
    elements.imageModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            switchScreen('main');
            appState.currentPassword = '';
            updatePasswordDisplay();
        }
    });

    // Suporte a teclado físico
    document.addEventListener('keydown', function(e) {
        if (e.key >= '0' && e.key <= '9') {
            handleKeypadInput(e.key);
        } else if (e.key === 'Backspace') {
            handleKeypadInput('clear');
        } else if (e.key === 'Enter') {
            handleKeypadInput('enter');
        }
    });

    // Verificar suporte WebAuthn
    if (!window.webAuthnHelper.isSupported) {
        utils.showMessage(
            'Navegador Incompatível', 
            'Este navegador não suporta autenticação biométrica. Use um navegador moderno com suporte a WebAuthn.', 
            '⚠️'
        );
    }

    console.log('Aplicação inicializada com sucesso!');
    console.log('Usuários cadastrados:', appState.users.length);
});

