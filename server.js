const express = require("express");
const bodyParser = require("body-parser");
const base64url = require("base64url");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // serve index.html

// Armazenamento simples em memória (depois pode trocar por DB)
let users = {}; // { username: { id, credentials, image } }

// Utilitário para gerar desafios
function generateChallenge() {
  return base64url(crypto.randomBytes(32));
}

// Rota de opções de cadastro
app.post("/register-options", (req, res) => {
  const { username, image } = req.body;

  if (!username || !image) {
    return res.status(400).json({ error: "Nome de usuário e imagem são obrigatórios." });
  }

  const userId = base64url(crypto.randomBytes(16));

  users[username] = {
    id: userId,
    image: image,
    credentials: []
  };

  const options = {
    challenge: generateChallenge(),
    rp: { name: "Biometria Lanche", id: req.hostname },
    user: {
      id: Buffer.from(userId),
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    timeout: 60000,
    attestation: "direct",
  };

  res.json(options);
});

// Rota de opções de autenticação
app.get("/auth-options", (req, res) => {
  const options = {
    challenge: generateChallenge(),
    timeout: 60000,
    rpId: req.hostname,
    allowCredentials: [],
    userVerification: "preferred",
  };

  res.json(options);
});

// Rota de verificação de autenticação
app.post("/verify-auth", (req, res) => {
  // Aqui você trataria a resposta real do navegador
  // Por enquanto vamos só simular o sucesso
  res.json({ success: true, image: "IMAGEM_DO_USUARIO" });
});

// Inicialização
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
