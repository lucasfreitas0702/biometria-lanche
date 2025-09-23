// WebAuthn Helper Functions
class WebAuthnHelper {
    constructor() {
        this.isSupported = this.checkSupport();
    }

    checkSupport() {
        return !!(navigator.credentials && navigator.credentials.create && navigator.credentials.get && window.PublicKeyCredential);
    }

    // Converter ArrayBuffer para Base64
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    // Converter Base64 para ArrayBuffer
    base64ToArrayBuffer(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Gerar ID único para o usuário
    generateUserId() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return this.arrayBufferToBase64(array);
    }

    // Registrar nova credencial biométrica
    async registerCredential(username = 'user') {
        if (!this.isSupported) {
            throw new Error('WebAuthn não é suportado neste navegador');
        }

        try {
            const userId = this.generateUserId();
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const publicKeyCredentialCreationOptions = {
                challenge: challenge,
                rp: {
                    name: "Sistema de Autenticação Biométrica",
                    id: window.location.hostname,
                },
                user: {
                    id: new TextEncoder().encode(userId),
                    name: username,
                    displayName: username,
                },
                pubKeyCredParams: [
                    {
                        alg: -7, // ES256
                        type: "public-key"
                    },
                    {
                        alg: -257, // RS256
                        type: "public-key"
                    }
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Preferir biometria do dispositivo
                    userVerification: "required",
                    requireResidentKey: false
                },
                timeout: 60000,
                attestation: "direct"
            };

            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });

            if (!credential) {
                throw new Error('Falha ao criar credencial');
            }

            return {
                credentialId: this.arrayBufferToBase64(credential.rawId),
                publicKey: this.arrayBufferToBase64(credential.response.getPublicKey()),
                userId: userId
            };

        } catch (error) {
            console.error('Erro no registro biométrico:', error);
            throw error;
        }
    }

    // Autenticar usando credencial existente
    async authenticateCredential(credentialId) {
        if (!this.isSupported) {
            throw new Error('WebAuthn não é suportado neste navegador');
        }

        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const publicKeyCredentialRequestOptions = {
                challenge: challenge,
                allowCredentials: [{
                    id: this.base64ToArrayBuffer(credentialId),
                    type: 'public-key',
                    transports: ['internal', 'usb', 'nfc', 'ble']
                }],
                userVerification: "required",
                timeout: 60000,
            };

            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });

            if (!assertion) {
                throw new Error('Falha na autenticação');
            }

            return {
                credentialId: this.arrayBufferToBase64(assertion.rawId),
                signature: this.arrayBufferToBase64(assertion.response.signature),
                authenticatorData: this.arrayBufferToBase64(assertion.response.authenticatorData),
                clientDataJSON: this.arrayBufferToBase64(assertion.response.clientDataJSON)
            };

        } catch (error) {
            console.error('Erro na autenticação biométrica:', error);
            throw error;
        }
    }

    // Verificar se o dispositivo tem biometria disponível
    async checkBiometricAvailability() {
        if (!this.isSupported) {
            return false;
        }

        try {
            // Tentar verificar se há autenticadores disponíveis
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            return available;
        } catch (error) {
            console.error('Erro ao verificar disponibilidade biométrica:', error);
            return false;
        }
    }

    // Obter informações sobre o erro
    getErrorMessage(error) {
        if (error.name === 'NotSupportedError') {
            return 'Biometria não é suportada neste dispositivo';
        } else if (error.name === 'SecurityError') {
            return 'Erro de segurança. Verifique se está usando HTTPS';
        } else if (error.name === 'NotAllowedError') {
            return 'Acesso à biometria foi negado pelo usuário';
        } else if (error.name === 'InvalidStateError') {
            return 'Credencial já existe ou estado inválido';
        } else if (error.name === 'ConstraintError') {
            return 'Restrições de segurança não atendidas';
        } else if (error.name === 'NotReadableError') {
            return 'Erro ao ler dados biométricos';
        } else if (error.name === 'UnknownError') {
            return 'Erro desconhecido na autenticação';
        } else {
            return error.message || 'Erro na autenticação biométrica';
        }
    }
}

// Instância global do helper
window.webAuthnHelper = new WebAuthnHelper();

