const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do multer para upload de imagens
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limite
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

// Simulação de banco de dados em memória (para desenvolvimento)
// Em produção, você deve usar um banco de dados real
let users = [];

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API para verificar se uma senha já existe
app.post('/api/check-password', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Senha é obrigatória' });
  }
  
  const exists = users.some(user => user.password === password);
  res.json({ exists });
});

// API para cadastrar usuário
app.post('/api/register', upload.single('image'), (req, res) => {
  try {
    const { password, credentialId, publicKey } = req.body;
    const image = req.file;
    
    if (!password || !credentialId || !publicKey || !image) {
      return res.status(400).json({ 
        error: 'Todos os campos são obrigatórios: senha, credencial biométrica e imagem' 
      });
    }
    
    // Verificar se a senha já existe
    const passwordExists = users.some(user => user.password === password);
    if (passwordExists) {
      return res.status(400).json({ 
        error: 'Esta senha numérica já está em uso. Escolha outra.' 
      });
    }
    
    // Criar novo usuário
    const newUser = {
      id: uuidv4(),
      password: password,
      credentialId: credentialId,
      publicKey: publicKey,
      image: {
        data: image.buffer.toString('base64'),
        contentType: image.mimetype
      },
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    res.json({ 
      success: true, 
      message: 'Usuário cadastrado com sucesso!',
      userId: newUser.id 
    });
    
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API para autenticar usuário
app.post('/api/authenticate', (req, res) => {
  try {
    const { password, credentialId } = req.body;
    
    if (!password || !credentialId) {
      return res.status(400).json({ 
        error: 'Senha e credencial biométrica são obrigatórias' 
      });
    }
    
    // Encontrar usuário pela senha
    const user = users.find(u => u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    // Verificar credencial biométrica
    if (user.credentialId !== credentialId) {
      return res.status(401).json({ error: 'Biometria não reconhecida' });
    }
    
    // Retornar dados do usuário (incluindo imagem)
    res.json({
      success: true,
      user: {
        id: user.id,
        image: `data:${user.image.contentType};base64,${user.image.data}`
      }
    });
    
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API para listar usuários (apenas para debug - remover em produção)
app.get('/api/users', (req, res) => {
  const userList = users.map(user => ({
    id: user.id,
    password: user.password,
    createdAt: user.createdAt
  }));
  res.json(userList);
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});

