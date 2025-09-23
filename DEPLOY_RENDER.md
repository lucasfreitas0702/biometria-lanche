# 🚀 Guia de Deploy no Render - Passo a Passo

Este guia te ajudará a fazer o deploy da aplicação de autenticação biométrica no Render de forma rápida e sem erros.

## ✅ Pré-requisitos

- [ ] Conta no GitHub
- [ ] Conta no Render (gratuita)
- [ ] Todos os arquivos do projeto

## 📁 Passo 1: Preparar o GitHub

### 1.1 Criar Repositório
1. Acesse [github.com](https://github.com)
2. Clique em "New repository"
3. Nome: `biometric-auth-app` (ou outro nome)
4. Marque como **Public**
5. Clique em "Create repository"

### 1.2 Upload dos Arquivos
**Opção A - Interface Web:**
1. Clique em "uploading an existing file"
2. Arraste todos os arquivos do projeto
3. Commit: "Initial commit"
4. Clique em "Commit changes"

**Opção B - Git CLI:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/biometric-auth-app.git
git push -u origin main
```

## 🌐 Passo 2: Deploy no Render

### 2.1 Criar Web Service
1. Acesse [render.com](https://render.com)
2. Faça login ou crie conta gratuita
3. No dashboard, clique em **"New +"**
4. Selecione **"Web Service"**

### 2.2 Conectar Repositório
1. Clique em **"Connect a repository"**
2. Autorize o Render a acessar seu GitHub
3. Selecione o repositório `biometric-auth-app`
4. Clique em **"Connect"**

### 2.3 Configurar o Service

**Configurações Obrigatórias:**
```
Name: biometric-auth-app
Environment: Node
Region: Oregon (US West) ou Frankfurt (Europe)
Branch: main
Root Directory: (deixe vazio)
Build Command: npm install
Start Command: npm start
```

**Configurações Avançadas:**
```
Node Version: 18
Auto-Deploy: Yes
```

### 2.4 Finalizar Deploy
1. Clique em **"Create Web Service"**
2. Aguarde o build (2-5 minutos)
3. ✅ Pronto! Sua aplicação estará online

## 🔗 Passo 3: Acessar a Aplicação

1. Após o deploy, você receberá uma URL como:
   `https://biometric-auth-app-xxxx.onrender.com`

2. **IMPORTANTE**: A aplicação precisa de HTTPS para funcionar (biometria)
   - O Render fornece HTTPS automaticamente ✅

## 🧪 Passo 4: Testar a Aplicação

### 4.1 Teste Básico
1. Acesse a URL fornecida
2. Verifique se o teclado numérico aparece
3. Teste o botão "Cadastrar Usuário"

### 4.2 Teste de Cadastro
1. Clique em "Cadastrar Usuário"
2. Digite uma senha (ex: 1234)
3. Selecione uma foto
4. Teste o registro de biometria
5. Salve o usuário

### 4.3 Teste de Login
1. Volte à tela principal
2. Digite a senha cadastrada
3. Confirme a biometria
4. Verifique se a foto aparece por 4 segundos

## ⚠️ Possíveis Problemas e Soluções

### Build Failed
**Problema**: Erro durante o build
**Solução**: 
- Verifique se o `package.json` está na raiz
- Confirme se não há erros de sintaxe nos arquivos

### Biometria não funciona
**Problema**: WebAuthn não carrega
**Solução**:
- Confirme que está usando HTTPS (Render fornece automaticamente)
- Teste em dispositivo com biometria configurada
- Use navegador compatível (Chrome, Safari, Firefox)

### Aplicação não carrega
**Problema**: Página em branco ou erro 500
**Solução**:
- Verifique os logs no dashboard do Render
- Confirme se o comando start está correto: `npm start`
- Verifique se a porta está configurada corretamente

## 📊 Monitoramento

### Logs em Tempo Real
1. No dashboard do Render
2. Clique no seu service
3. Aba "Logs" para ver atividade em tempo real

### Métricas
- CPU e memória na aba "Metrics"
- Uptime e performance

## 🔄 Atualizações Automáticas

Com Auto-Deploy ativado:
1. Faça mudanças no código
2. Commit no GitHub
3. Push para a branch main
4. Render fará deploy automaticamente

## 💰 Custos

**Plano Gratuito do Render:**
- ✅ 750 horas/mês (suficiente para uso pessoal)
- ✅ HTTPS incluído
- ✅ Deploy automático
- ⚠️ Aplicação "dorme" após 15min sem uso
- ⚠️ Pode demorar ~30s para "acordar"

## 🆘 Suporte

Se algo der errado:

1. **Verifique os logs** no dashboard do Render
2. **Confirme as configurações** seguindo este guia
3. **Teste localmente** primeiro com `npm start`
4. **Verifique o README.md** para mais detalhes técnicos

## ✅ Checklist Final

- [ ] Repositório criado no GitHub
- [ ] Todos os arquivos enviados
- [ ] Web Service criado no Render
- [ ] Build concluído com sucesso
- [ ] Aplicação acessível via HTTPS
- [ ] Teclado numérico funcionando
- [ ] Cadastro de usuário funcionando
- [ ] Biometria funcionando
- [ ] Login e exibição de imagem funcionando

**🎉 Parabéns! Sua aplicação está online e funcionando!**

---

**Dica**: Salve a URL da sua aplicação e compartilhe com segurança. Lembre-se de que os dados ficam salvos no navegador de cada usuário.

