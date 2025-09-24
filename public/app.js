// ===============================
// Helpers de conversão Base64URL
// ===============================
function bufferToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(base64url) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return buffer;
}

// ===============================
// Cadastro (Imagem + Biometria)
// ===============================
const imageInput = document.getElementById("image-input");
const preview = document.getElementById("preview");
const saveButton = document.getElementById("save-button");
let biometricCredential = null;

if (imageInput) {
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
    checkReadyToSave();
  });
}

async function registerBiometric() {
  try {
    const resp = await fetch("/webauthn/register/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Date.now() }), // id fake só p/ exemplo
    });
    const data = await resp.json();
    const publicKey = data.publicKey;

    // Converter dados
    publicKey.challenge = base64urlToBuffer(publicKey.challenge);
    publicKey.user.id = base64urlToBuffer(publicKey.user.id);

    const credential = await navigator.credentials.create({ publicKey });
    biometricCredential = credential;
    document.getElementById("biometric-status").innerText =
      "Biometria registrada com sucesso ✅";
    checkReadyToSave();
  } catch (err) {
    console.error("Erro no registro biométrico:", err);
    document.getElementById("biometric-status").innerText =
      "Erro ao registrar biometria ❌";
  }
}

if (saveButton) {
  saveButton.addEventListener("click", async () => {
    if (!imageInput.files.length || !biometricCredential) return;

    // montar dados p/ envio
    const formData = new FormData();
    formData.append("imagem", imageInput.files[0]);
    formData.append("credentialId", bufferToBase64url(biometricCredential.rawId));
    formData.append("publicKey", JSON.stringify(biometricCredential.response));

    const resp = await fetch("/api/register", { method: "POST", body: formData });
    const data = await resp.json();
    if (data.success) {
      alert("Usuário cadastrado com sucesso!");
      window.location.href = "/";
    } else {
      alert("Erro no cadastro: " + data.error);
    }
  });
}

function checkReadyToSave() {
  if (imageInput && imageInput.files.length && biometricCredential) {
    saveButton.removeAttribute("disabled");
  }
}

// dispara biometria logo no cadastro
if (document.getElementById("register-screen")) {
  registerBiometric();
}

// ===============================
// Login Biométrico Automático
// ===============================
async function tryBiometricLogin() {
  if (!window.PublicKeyCredential) {
    document.getElementById("biometric-status").innerText =
      "Seu navegador não suporta biometria.";
    return;
  }

  try {
    const resp = await fetch("/webauthn/auth/options");
    const data = await resp.json();
    const publicKey = data.publicKey;

    publicKey.challenge = base64urlToBuffer(publicKey.challenge);
    if (publicKey.allowCredentials) {
      publicKey.allowCredentials = publicKey.allowCredentials.map(cred => ({
        ...cred,
        id: base64urlToBuffer(cred.id)
      }));
    }

    const assertion = await navigator.credentials.get({ publicKey });

    const credential = {
      id: assertion.id,
      rawId: bufferToBase64url(assertion.rawId),
      type: assertion.type,
      response: {
        clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
        authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
        signature: bufferToBase64url(assertion.response.signature),
        userHandle: assertion.response.userHandle
          ? bufferToBase64url(assertion.response.userHandle)
          : null,
      },
    };

    const finishResp = await fetch("/webauthn/auth/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assertion: credential }),
    });

    const finishData = await finishResp.json();

    if (finishData.ok) {
      document.getElementById("biometric-status").innerText =
        "Login biométrico bem-sucedido ✅";
      const result = document.getElementById("login-result");
      if (result && finishData.imageUrl) {
        result.innerHTML = `
          <h3>Usuário autenticado!</h3>
          <img src="${finishData.imageUrl}" alt="Imagem do usuário" class="preview-image" />
        `;
      }
    } else {
      document.getElementById("biometric-status").innerText =
        "Falha na biometria ❌";
    }
  } catch (err) {
    console.error("Erro no login biométrico:", err);
    document.getElementById("biometric-status").innerText =
      "Erro ao autenticar ❌";
  }
}

// dispara biometria logo no login
if (document.getElementById("login-screen")) {
  tryBiometricLogin();
}
