const express = require("express");
const fs = require("fs");
const path = require("path");
const base64url = require("base64url");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Arquivo onde salvamos os usuários
const USERS_FILE = path.join(__dirname, "users.json");

// Garante que o arquivo existe
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}

// ---------------- ROTAS ----------------

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Cadastro de usuário
app.post("/register", (req, res) => {
  const { id, image } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));

  if (users.find((u) => u.id === id)) {
    return res.status(400).json({ error: "Usuário já cadastrado" });
  }

  users.push({ id, image });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

// Opções para autenticação biométrica
app.get("/auth-options", (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE));

  const options = {
    challenge: new Uint8Array([1, 2, 3, 4]),
    timeout: 60000,
    rpId: req.hostname, // ✅ Agora se ajusta ao domínio automaticamente
    allowCredentials: users.map((u) => ({
      id: new Uint8Array(Buffer.from(u.id, "utf-8")),
      type: "public-key",
    })),
    userVerification: "preferred",
  };

  res.json(options);
});

// Verificação da autenticação
app.post("/verify-auth", (req, res) => {
  // Aqui no exemplo só validamos que veio algum dado
  if (!req.body || !req.body.id) {
    return res.status(400).json({ success: false, error: "Dados inválidos" });
  }

  // Retorna a imagem do usuário autenticado
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const user = users.find((u) => u.id === req.body.id);

  if (!user) {
    return res.status(404).json({ success: false, error: "Usuário não encontrado" });
  }

  res.json({ success: true, image: user.image });
});

// ---------------- INICIALIZAÇÃO ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
