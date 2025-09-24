import express from "express";
import session from "express-session";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Fido2Lib } from "fido2-lib";

const app = express();
const PORT = process.env.PORT || 5000;

// Configura pastas
const __dirname = path.resolve();
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Upload de imagens
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage });

// Sessões
app.use(
  session({
    secret: process.env.SESSION_SECRET || "segredo",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.json());
app.use(express.static("public"));

// Banco SQLite
let db;
(async () => {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS pessoas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      credential_id TEXT UNIQUE,
      public_key BLOB,
      sign_count INTEGER DEFAULT 0,
      imagem TEXT NOT NULL
    )
  `);
})();

// Configuração FIDO2
const fido = new Fido2Lib({
  timeout: 60000,
  rpId: process.env.RP_ID || "biometria-lanche-10.onrender.com",
  rpName: "Biometria App",
  challengeSize: 64,
  attestation: "none",
  authenticatorSelection: {
    userVerification: "discouraged",
  },
});

// ---------------- ROTAS ----------------

// Cadastro inicial
app.post("/api/cadastro", upload.single("imagem"), async (req, res) => {
  if (!req.file) {
    return res.json({ ok: false, error: "Imagem obrigatória" });
  }
  const result = await db.run(
    "INSERT INTO pessoas (imagem) VALUES (?)",
    req.file.filename
  );
  res.json({ ok: true, id: result.lastID });
});

// Início do registro WebAuthn
app.post("/webauthn/register/options", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.json({ error: "id obrigatório" });

  const user = {
    id: Buffer.from(String(id)),
    name: String(id),
    displayName: "Usuário " + id,
  };

  const opts = await fido.attestationOptions();
  opts.user = user;

  req.session.registerOpts = opts;
  req.session.userId = id;

  res.json({ publicKey: opts });
});

// Finalização do registro
app.post("/webauthn/register/finish", async (req, res) => {
  try {
    const { id, att } = req.body;
    const state = req.session.registerOpts;
    if (!state) return res.json({ error: "state inválido" });

    const attRes = {
      rawId: Buffer.from(att.rawId, "base64url"),
      response: {
        attestationObject: Buffer.from(
          att.response.attestationObject,
          "base64url"
        ),
        clientDataJSON: Buffer.from(att.response.clientDataJSON, "base64url"),
      },
    };

    const reg = await fido.attestationResult(attRes, state);

    const credId = att.rawId;
    const pubKey = reg.authnrData.get("credentialPublicKeyPem");
    const signCount = reg.authnrData.get("signCount");

    await db.run(
      "UPDATE pessoas SET credential_id=?, public_key=?, sign_count=? WHERE id=?",
      credId,
      pubKey,
      signCount,
      id
    );

    delete req.session.registerOpts;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Falha no registro" });
  }
});

// Início da autenticação
app.get("/webauthn/auth/options", async (req, res) => {
  const rows = await db.all("SELECT credential_id FROM pessoas WHERE credential_id IS NOT NULL");
  if (rows.length === 0) return res.json({ error: "Nenhuma credencial cadastrada" });

  const allowCredentials = rows.map(r => ({
    type: "public-key",
    id: r.credential_id,
  }));

  const opts = await fido.assertionOptions();
  opts.allowCredentials = allowCredentials;

  req.session.authOpts = opts;
  res.json({ publicKey: opts });
});

// Finalização da autenticação
app.post("/webauthn/auth/finish", async (req, res) => {
  try {
    const { assertion } = req.body;
    const state = req.session.authOpts;
    if (!state) return res.json({ error: "state inválido" });

    const credId = assertion.rawId;

    const row = await db.get("SELECT * FROM pessoas WHERE credential_id=?", credId);
    if (!row) return res.json({ ok: false, error: "Credencial não encontrada" });

    const assRes = {
      rawId: Buffer.from(assertion.rawId, "base64url"),
      response: {
        authenticatorData: Buffer.from(assertion.response.authenticatorData, "base64url"),
        clientDataJSON: Buffer.from(assertion.response.clientDataJSON, "base64url"),
        signature: Buffer.from(assertion.response.signature, "base64url"),
        userHandle: assertion.response.userHandle
          ? Buffer.from(assertion.response.userHandle, "base64url")
          : null,
      },
    };

    await fido.assertionResult(assRes, state, {
      credentialPublicKey: row.public_key,
      counter: row.sign_count,
    });

    res.json({ ok: true, imageUrl: "/uploads/" + row.imagem });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: "Falha na autenticação" });
  }
});

// ---------------------------------------

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
