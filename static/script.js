// Utilities
function b64ToBuf(s){ return Uint8Array.from(atob(s), c=>c.charCodeAt(0)).buffer; }
function bufToB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }

// --- Keypad rendering for index.html ---
document.addEventListener('DOMContentLoaded', ()=>{
  const display = document.getElementById('display');
  const keyboard = document.getElementById('keyboard');
  const msg = document.getElementById('msg');
  if(keyboard){
    for(let i=1;i<=9;i++){
      const b=document.createElement('button'); b.className='kbtn'; b.textContent=i;
      b.onclick=()=>{ display.textContent=(display.textContent||'')+i; };
      keyboard.appendChild(b);
    }
    const b0=document.createElement('button'); b0.className='kbtn'; b0.textContent='0';
    b0.onclick=()=>{ display.textContent=(display.textContent||'')+'0'; };
    const bdel=document.createElement('button'); bdel.className='kbtn'; bdel.textContent='←';
    bdel.onclick=()=>{ display.textContent=(display.textContent||'').slice(0,-1); };
    const bok=document.createElement('button'); bok.className='kbtn'; bok.textContent='OK';
    bok.onclick=doPinLogin;
    keyboard.appendChild(b0);
    keyboard.appendChild(bdel);
    keyboard.appendChild(bok);
  }

  const btnClear=document.getElementById('btnClear');
  const btnEnter=document.getElementById('btnEnter');
  const btnBio=document.getElementById('btnBio');
  if(btnClear) btnClear.onclick=()=>{ display.textContent=''; msg.textContent=''; };
  if(btnEnter) btnEnter.onclick=doPinLogin;
  if(btnBio) btnBio.onclick=doBiometricLogin;

  // cadastro page handlers
  const form = document.getElementById('formCadastro');
  if(form){
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const res = await fetch('/api/cadastro', { method:'POST', body: fd });
      const j = await res.json();
      const cadMsg = document.getElementById('cadMsg');
      if(j.ok){
        cadMsg.style.color='green'; cadMsg.textContent='Cadastrado! PIN: '+j.pin;
        const act = document.getElementById('activateBio');
        act.disabled=false; act.dataset.pin=j.pin;
        act.onclick = ()=>activateBiometry(j.pin);
      } else {
        cadMsg.style.color='red'; cadMsg.textContent = j.error || 'Erro';
      }
    }
  }
});

// --- PIN login ---
async function doPinLogin(){
  const display = document.getElementById('display');
  const pin = (display && display.textContent) ? display.textContent : '';
  const msg = document.getElementById('msg');
  if(!pin){ if(msg) msg.textContent='Digite o PIN'; return; }
  try{
    const res = await fetch('/api/login_pin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin })});
    const j = await res.json();
    if(j.ok){
      showImage(j.imageUrl);
    } else {
      if(msg) msg.textContent = j.error || 'PIN inválido';
      if(display) display.textContent = '';
    }
  }catch(e){
    if(msg) msg.textContent = 'Erro servidor';
  }
}

// show image for 4s
function showImage(url){
  document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000"><img src="${url}" style="max-width:90%;max-height:90%"></div>`;
  setTimeout(()=>{ window.location.href = '/'; }, 4000);
}

// ----- WebAuthn registration & authentication -----
async function activateBiometry(pin){
  try{
    const res = await fetch('/webauthn/register/options', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin })});
    const opts = await res.json();
    if(opts.error){ alert('Erro: '+opts.error); return; }
    const publicKey = opts.publicKey;
    publicKey.challenge = b64ToBuf(publicKey.challenge);
    publicKey.user.id = b64ToBuf(publicKey.user.id);

    const cred = await navigator.credentials.create({ publicKey });
    const att = {
      id: cred.id,
      rawId: bufToB64(cred.rawId),
      response: {
        clientDataJSON: bufToB64(cred.response.clientDataJSON),
        attestationObject: bufToB64(cred.response.attestationObject)
      }
    };
    const fin = await fetch('/webauthn/register/finish', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin, att })});
    const j = await fin.json();
    if(j.ok) alert('Biometria ativada!');
    else alert('Erro ativar: '+(j.error||JSON.stringify(j)));
  }catch(e){
    alert('Erro ao cadastrar biometria: ' + e);
  }
}

async function doBiometricLogin(){
  try{
    const res = await fetch('/webauthn/auth/options');
    const opts = await res.json();
    if(opts.error){ alert('Erro: '+opts.error); return; }
    const pub = opts.publicKey;
    pub.challenge = b64ToBuf(pub.challenge);
    pub.allowCredentials = (pub.allowCredentials||[]).map(c => ({ id: b64ToBuf(c.id), type: c.type }));

    const assertion = await navigator.credentials.get({ publicKey: pub });
    const auth = {
      id: assertion.id,
      rawId: bufToB64(assertion.rawId),
      response: {
        clientDataJSON: bufToB64(assertion.response.clientDataJSON),
        authenticatorData: bufToB64(assertion.response.authenticatorData),
        signature: bufToB64(assertion.response.signature)
      }
    };
    const fin = await fetch('/webauthn/auth/finish', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ assertion: auth })});
    const j = await fin.json();
    if(j.ok){
      showImage(j.imageUrl);
    } else {
      alert('Falha: ' + (j.error || JSON.stringify(j)));
    }
  }catch(e){
    alert('Erro WebAuthn (auth): ' + e);
  }
}
