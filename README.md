# Sistema de Autenticação Biométrica

Um sistema moderno de autenticação que combina senhas numéricas com biometria usando WebAuthn, desenvolvido para funcionar perfeitamente no Render.

## 🚀 Funcionalidades

- **Teclado Numérico Fixo**: Interface responsiva com teclado sempre visível
- **Cadastro de Usuários**: Registro com senha numérica, imagem e biometria
- **Autenticação Biométrica**: Usando WebAuthn para máxima segurança
- **Validação de Senhas**: Não permite senhas duplicadas
- **Exibição Temporizada**: Mostra imagem do usuário por 4 segundos após login
- **Armazenamento Local**: Cache no navegador para persistência dos dados
- **Interface Moderna**: Design responsivo e atrativo

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Autenticação**: WebAuthn API
- **Armazenamento**: LocalStorage + Backup no servidor
- **Upload**: Multer para processamento de imagens
- **Segurança**: CORS habilitado, validações robustas

## 📋 Pré-requisitos

- Node.js 18+ 
- Navegador moderno com suporte a WebAuthn
- HTTPS (obrigatório para WebAuthn em produção)

## 🚀 Deploy no Render

### 1. Preparar o Repositório

1. Crie um novo repositório no GitHub
2. Faça upload de todos os arquivos deste projeto
3. Certifique-se de que o `package.json` está na raiz

### 2. Configurar no Render

1. Acesse [render.com](https://render.com) e faça login
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure as seguintes opções:

**Configurações Básicas:**
- **Name**: `biometric-auth-app` (ou nome de sua escolha)
- **Environment**: `Node`
- **Region**: Escolha a mais próxima
- **Branch**: `main` (ou sua branch principal)

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Configurações Avançadas:**
- **Node Version**: `18` (ou superior)
- **Auto-Deploy**: `Yes` (para deploy automático)

### 3. Variáveis de Ambiente (Opcional)

Se necessário, adicione variáveis de ambiente na seção "Environment":
- `NODE_ENV=production`
- `PORT=3000` (Render define automaticamente)

### 4. Deploy

1. Clique em "Create Web Service"
2. Aguarde o build e deploy (geralmente 2-5 minutos)
3. Acesse a URL fornecida pelo Render

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Acessar aplicação
http://localhost:3000
```

## 📱 Como Usar

### Cadastro de Usuário

1. Clique em "Cadastrar Usuário"
2. Digite uma senha numérica (4-10 dígitos)
3. Selecione uma foto do usuário
4. Registre sua biometria (impressão digital, Face ID, etc.)
5. Clique em "Salvar Usuário"

### Login

1. Digite sua senha numérica na tela principal
2. Pressione ✓ ou Enter
3. Confirme sua biometria quando solicitado
4. Sua foto será exibida por 4 segundos

## 🔒 Segurança

- **WebAuthn**: Padrão W3C para autenticação segura
- **Biometria Local**: Dados biométricos nunca saem do dispositivo
- **Validação Dupla**: Senha + biometria obrigatórias
- **HTTPS**: Obrigatório para funcionamento da biometria
- **Armazenamento Seguro**: Dados criptografados no localStorage

## 🌐 Compatibilidade

### Navegadores Suportados:
- Chrome 67+
- Firefox 60+
- Safari 14+
- Edge 18+

### Dispositivos:
- Desktop com Windows Hello
- Smartphones com Touch ID/Face ID
- Dispositivos com leitor de impressão digital

## 🐛 Solução de Problemas

### Biometria não funciona:
- Verifique se está usando HTTPS
- Confirme se o dispositivo tem biometria configurada
- Teste em um navegador compatível

### Erro de CORS:
- Verifique se o servidor está configurado corretamente
- Confirme se as origens estão permitidas

### Imagens não carregam:
- Verifique o tamanho do arquivo (máximo 5MB)
- Use formatos suportados: JPG, PNG, GIF, WebP

## 📄 Estrutura do Projeto

```
biometric-auth-app/
├── server.js              # Servidor Express principal
├── package.json           # Dependências e scripts
├── README.md              # Este arquivo
└── public/                # Arquivos estáticos
    ├── index.html         # Interface principal
    ├── styles.css         # Estilos CSS
    ├── app.js            # Lógica principal
    └── webauthn.js       # Módulo WebAuthn
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique a seção de solução de problemas
2. Abra uma issue no GitHub
3. Consulte a documentação do WebAuthn

---

**Desenvolvido com ❤️ para máxima segurança e usabilidade**

