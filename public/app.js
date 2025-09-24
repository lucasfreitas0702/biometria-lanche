async function registerBiometric() {
  const fileInput = document.getElementById("image-input");
  if (!fileInput.files.length) {
    alert("Selecione uma imagem primeiro.");
    return;
  }

  // 1. Cria usuário no backend sem credencial ainda
  const formData = new FormData();
  formData.append("imagem", fileInput.files[0]);

  const res = await fetch("/api/cadastro", { method: "POST", body: formData });
  const data = await res.json();

  if (!data.ok) {
    alert(data.error || "Erro no cadastro inicial");
    return;
  }

  const userId = data.id;

  // 2. Pede ao backend opções de registro
  const optRes = await fetch("/webauthn/register/options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: userId }),
  });

  const optData = await optRes.json();
  let publicKey = optData.publicKey;

  // Converte base64url para ArrayBuffer
  publicKey.challenge = base64urlToBuffer(publicKey.challenge);
  publicKey.user.id = base64urlToBuffer(publicKey.user.id);

  // 3. Cria credencial no navegador
  const cred = await navigator.credentials.create({ publicKey });

  // 4. Envia credencial ao backend
  const att = {
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    type: cred.type,
    response: {
      attestationObject: bufferToBase64url(cred.response.attestationObject),
      clientDataJSON: bufferToBase64url(cred.response.clientDataJSON),
    },
  };

  const finishRes = await fetch("/webauthn/register/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: userId, att }),
  });

  const finishData = await finishRes.json();
  const statusEl = document.getElementById("register-status");
  if (finishData.ok) {
    statusEl.textContent = "Biometria cadastrada com sucesso!";
    statusEl.className = "biometric-status success";
    document.getElementById("save-user").disabled = false;
  } else {
    statusEl.textContent = finishData.error || "Erro ao finalizar cadastro";
    statusEl.className = "biometric-status error";
  }
}

async function tryBiometricLogin() {
  try {
    // 1. Pede ao backend opções de autenticação
    const optRes = await fetch("/webauthn/auth/options");
    const optData = await optRes.json();

    let publicKey = optData.publicKey;
    publicKey.challenge = base64urlToBuffer(publicKey.challenge);

    if (publicKey.allowCredentials) {
      publicKey.allowCredentials = publicKey.allowCredentials.map(c => ({
        ...c,
        id: base64urlToBuffer(c.id),
      }));
    }

    // 2. Pede autenticação ao navegador
    const assertion = await navigator.credentials.get({ publicKey });

    // 3. Envia resposta ao backend
    const authData = {
      id: assertion.id,
      rawId: bufferToBase64url(assertion.rawId),
      type: assertion.type,
      response: {
        authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
        clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
        signature: bufferToBase64url(assertion.response.signature),
        userHandle: assertion.response.userHandle
          ? bufferToBase64url(assertion.response.userHandle)
          : null,
      },
    };

    const finishRes = await fetch("/webauthn/auth/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assertion: authData }),
    });

    const result = await finishRes.json();
    const loginResult = document.getElementById("login-result");

    if (result.ok) {
      loginResult.innerHTML = `<img src="${result.imageUrl}" alt="foto" class="preview-image"/>`;
    } else {
      loginResult.textContent = "Erro ao autenticar ❌";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("login-result").textContent = "Erro ao autenticar ❌";
  }
}

// Helpers
function bufferToBase64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(base64url) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const str = atob(base64);
  return Uint8Array.from(str, c => c.charCodeAt(0)).buffer;
}
