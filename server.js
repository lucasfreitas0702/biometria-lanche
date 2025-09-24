const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const app = express();

app.use(bodyParser.json());
app.use(express.static("public")); // pasta com index.html

// Banco de dados em memória (trocar por banco real depois se quiser)
const users = {};

// Gerar desafio aleatório
function generateChallenge() {
  return crypto.randomBytes(32);
}

// Opções para autenticação
app.get("/auth-options", (req, res) => {
  const challenge = generateChallenge();

  users["defaultUser"] = users["defaultUser"] || {};
  users["defaultUser"].challenge = challenge;

  const options = {
    challenge: challenge,
    timeout: 60000,
    rpId: "localhost", // altere para seu domínio real quando publicar
    allowCredentials: users["defaultUser"].credentials || [],
    userVerification: "preferred"
  };

  res.json(options);
});

// Verificar resposta biométrica
app.post("/auth-verify", (req, res) => {
  const { id } = req.body;
  console.log("Credencial recebida:", id);

  // Aqui deveria validar assinatura com chave pública cadastrada
  // Por simplicidade, vamos aceitar sempre que houver id
  if (id) {
    return res.sendStatus(200);
  }
  res.sendStatus(400);
});

// Cadastro inicial de credenciais (opcional)
app.post("/register", (req, res) => {
  const { credential } = req.body;

  if (!users["defaultUser"]) {
    users["defaultUser"] = { credentials: [] };
  }

  users["defaultUser"].credentials.push({
    id: credential.id,
    type: credential.type,
    publicKey: credential.publicKey
  });

  res.sendStatus(201);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
