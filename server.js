const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// pasta de dados (salva os cadastros)
const USERS_FILE = path.join(__dirname, "users.json");

// se não existir, cria o arquivo de usuários
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}

app.use(bodyParser.json({ limit: "10mb" })); // permite imagens base64 grandes
app.use(express.static("public"));

// rota para registrar novo usuário
app.post("/register", (req, res) => {
  const { credential, image } = req.body;

  if (!credential || !image) {
    return res.status(400).json({ success: false, message: "Dados incompletos" });
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  users.push({
    id: credential.id,
    type: credential.type,
    image: image // base64 da imagem
  });

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.json({ success: true });
});

// rota que retorna opções para autenticação
app.get("/auth-options", (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE));

  const options = {
    challenge: new Uint8Array([1, 2, 3, 4]),
    timeout: 60000,
    rpId: "localhost",
    allowCredentials: users.map(u => ({
      id: new Uint8Array(Buffer.from(u.id, "utf-8")),
      type: "public-key"
    })),
    userVerification: "preferred"
  };

  res.json(options);
});

// rota para verificar a biometria e retornar a imagem
app.post("/auth-verify", (req, res) => {
  const { id } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));

  const user = users.find(u => u.id === id);

  if (!user) {
    return res.json({ success: false, message: "Usuário não encontrado" });
  }

  res.json({ success: true, image: user.image });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
