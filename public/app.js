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
// Login Biométrico Automático
// ===============================
async function tryBiometricLogin() {
  if (!window.PublicKeyCredential) {
    console.log("WebAuthn não suportado.");
    return;
  }

  try {
    // Obter opções do backend
    const resp = await fetch("/webauthn/auth/options");
    const data = await resp.json();
    const publicKey = data.publicKey;

    // Converter challenge e credenciais
    publicKey.challenge = base64urlToBuffer(publicKey.challenge);
    if (publicKey.allowCredentials) {
      publicKey.allowCredentials = publicKey.allowCredentials.map(cred => ({
        ...cred,
        id: base64urlToBuffer(cred.id)
      }));
    }

    // Dispara prompt biométrico automaticamente
    const assertion = await navigator.credentials.get({ publicKey });

    // Serializar resultado para enviar ao backend
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
      console.log("Login biométrico bem-sucedido!");
      mostrarUsuario(finishData);
    } else {
      console.warn("Falha na biometria:", finishData.error);
    }
  } catch (err) {
    console.warn("Erro no login biométrico:", err);
  }
}

// ===============================
// Login por Senha Numérica
// ===============================
let loginPin = "";

function updatePinDots() {
  const dotsContainer = document.getElementById("password-dots");
  if (!dotsContainer) return;
  dotsContainer.innerHTML = "";
  for (let i = 0; i < loginPin.length; i++) {
    const dot = document.createElement("div");
    dot.classList.add("password-dot");
    dotsContainer.appendChild(dot);
  }
}

function handleKeyPress(digit) {
  if (loginPin.length < 10) {
    loginPin += digit;
    updatePinDots();
  }
}

function handleClear() {
  loginPin = "";
  updatePinDots();
}

async function handleEnter() {
  if (loginPin.length < 4) {
    alert("Digite pelo menos 4 números.");
    return;
  }

  try {
    const resp = await fetch("/api/login_pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: loginPin }),
    });

    const data = await resp.json();
    if (data.ok) {
      console.log("Login por senha bem-sucedido!");
      mostrarUsuario(data);
    } else {
      alert(data.error || "Falha no login.");
      handleClear();
    }
  } catch (err) {
    console.error("Erro no login por senha:", err);
  }
}

// ===============================
// UI Helper
// ===============================
function mostrarUsuario(data) {
  const container = document.getElementById("login-result");
  if (container && data.imageUrl) {
    container.innerHTML = `
      <h3>Usuário autenticado!</h3>
      <img src="${data.imageUrl}" alt="Imagem do usuário" class="preview-image" />
    `;
  }
}

// ===============================
// Eventos
// ===============================

// Ativa biometria automática ao carregar
window.addEventListener("load", tryBiometricLogin);

// Liga teclas do teclado numérico
document.querySelectorAll("#login-screen .key").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("clear")) {
      handleClear();
    } else if (btn.classList.contains("enter")) {
      handleEnter();
    } else {
      handleKeyPress(btn.textContent.trim());
    }
  });
});
