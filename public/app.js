// Estado da aplicação
class AppState {
    constructor() {
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

    // Adicionar novo usuário
    addUser(userData) {
        this.users.push(userData);
        this.saveUsers();
    }

    // Encontrar usuário por credentialId
    findUserByCredentialId(credentialId) {
        return this.users.find(user => user.credentialId === credentialId);
    }
}

// Instância global do estado
const appState = new AppState();

// Elementos DOM
const elements = {
    // Telas
    mainScreen: document.getElementById('main-screen'),
    registerScreen: document.getElementById('register-screen'),
    
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
    biometricMessage: document.getElementById('biometric-message'),
    
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
                startBiometricAuthentication(); // Reinicia a autenticação automática
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
        // Limpar formulário de registro ao entrar
        appState.selectedImage = null;
        appState.biometricCredential = null;
        elements.imagePreview.innerHTML = '';
        elements.biometricStatus.innerHTML = '';
        elements.biometricStatus.className = 'biometric-status';
        validateRegisterForm();
    }
}

// Validar formulário de registro
function validateRegisterForm() {
    const hasImage = appState.selectedImage !== null;
    const hasBiometric = appState.biometricCredential !== null;
    
    elements.saveUserBtn.disabled = !hasImage || !hasBiometric;
}

// Registrar biometria (para cadastro de novo usuário)
async function registerBiometric() {
    if (!appState.selectedImage) {
        utils.showMessage('Erro', 'Selecione uma imagem primeiro', '❌');
        return;
    }

    try {
        utils.showLoading('Registrando biometria...');
        
        // Gerar um username único para a credencial WebAuthn
        const username = `user_${Date.now()}`;
        const credential = await window.webAuthnHelper.registerCredential(username);
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
    if (!appState.selectedImage || !appState.biometricCredential) {
        utils.showMessage('Erro', 'Todos os campos são obrigatórios', '❌');
        return;
    }

    try {
        utils.showLoading('Salvando usuário...');

        // Preparar dados do usuário
        const userData = {
            id: appState.biometricCredential.userId, // Usar o userId gerado pelo WebAuthn
            credentialId: appState.biometricCredential.credentialId,
            publicKey: appState.biometricCredential.publicKey,
            image: appState.selectedImage,
            createdAt: new Date().toISOString()
        };

        // Salvar localmente
        appState.addUser(userData);

        utils.hideLoading();
        utils.showMessage('Sucesso!', 'Usuário cadastrado com sucesso!', '✅');

        // Resetar formulário e voltar para tela principal
        switchScreen('main');
        startBiometricAuthentication(); // Reinicia a autenticação automática

    } catch (error) {
        utils.hideLoading();
        utils.showMessage('Erro', 'Erro ao salvar usuário: ' + error.message, '❌');
        console.error('Erro ao salvar usuário:', error);
    }
}

// Iniciar autenticação biométrica automática na tela principal
async function startBiometricAuthentication() {
    elements.biometricMessage.textContent = 'Por favor, use sua biometria para autenticar.';
    try {
        utils.showLoading('Aguardando biometria...');

        // Tentar autenticar com qualquer credencial existente
        const availableCredentials = appState.users.map(user => user.credentialId);
        
        if (availableCredentials.length === 0) {
            utils.hideLoading();
            elements.biometricMessage.textContent = 'Nenhum usuário cadastrado. Cadastre um novo usuário.';
            return;
        }

        const authResult = await window.webAuthnHelper.authenticateCredential(availableCredentials);
        
        // Encontrar o usuário correspondente à credencial autenticada
        const authenticatedUser = appState.findUserByCredentialId(authResult.credentialId);

        if (authenticatedUser) {
            utils.hideLoading();
            utils.showImageTimer(authenticatedUser.image, 4);
        } else {
            throw new Error('Credencial não encontrada localmente.');
        }

    } catch (biometricError) {
        utils.hideLoading();
        const errorMessage = window.webAuthnHelper.getErrorMessage(biometricError);
        elements.biometricMessage.textContent = `Falha na autenticação: ${errorMessage}. Tente novamente ou cadastre-se.`;
        console.error('Erro na autenticação biométrica automática:', biometricError);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
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
            startBiometricAuthentication(); // Reinicia a autenticação automática
        }
    });

    // Verificar suporte WebAuthn e iniciar autenticação automática
    if (!window.webAuthnHelper.isSupported) {
        utils.showMessage(
            'Navegador Incompatível', 
            'Este navegador não suporta autenticação biométrica. Use um navegador moderno com suporte a WebAuthn.', 
            '⚠️'
        );
    } else {
        startBiometricAuthentication();
    }

    console.log('Aplicação inicializada com sucesso!');
    console.log('Usuários cadastrados:', appState.users.length);
});


