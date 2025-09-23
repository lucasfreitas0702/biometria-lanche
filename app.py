import os
import json
import base64
import pathlib
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory, flash
from flask_session import Session
from werkzeug.utils import secure_filename
from fido2.server import Fido2Server
from fido2.webauthn import PublicKeyCredentialRpEntity, PublicKeyCredentialUserEntity, AttestedCredentialData

BASE = pathlib.Path(__file__).parent
UPLOAD_DIR = BASE / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
USERS_FILE = BASE / "usuarios.json"
STATE_DIR = BASE / ".webauthn_state"
STATE_DIR.mkdir(exist_ok=True)

# RP config (set in env for production)
RP_ID = os.environ.get("RP_ID", "localhost")
ORIGIN = os.environ.get("ORIGIN", "http://localhost:5000")

rp = PublicKeyCredentialRpEntity(RP_ID, "Biometria QR App")
server = Fido2Server(rp)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config["SESSION_TYPE"] = "filesystem"
app.secret_key = os.environ.get("FLASK_SECRET", "troque_essa_chave")
Session(app)

# ----------------- Storage helpers -----------------
def load_users():
    if not USERS_FILE.exists():
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

def find_user_by_pin(pin):
    for u in load_users():
        if u.get("pin") == pin:
            return u
    return None

def find_user_by_cred(cred_b64):
    for u in load_users():
        if u.get("credential_id") == cred_b64:
            return u
    return None

# --------------- Front pages -----------------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/cadastro")
def cadastro_page():
    return render_template("cadastro.html")

@app.route("/uploads/<path:fn>")
def uploaded(fn):
    return send_from_directory(str(UPLOAD_DIR), fn)

# --------------- API: cadastro (PIN + imagem) -----------------
@app.route("/api/cadastro", methods=["POST"])
def api_cadastro():
    pin = request.form.get("pin")
    if not pin:
        return jsonify({"ok": False, "error": "PIN obrigatório"}), 400
    # check unique pin
    if find_user_by_pin(pin):
        return jsonify({"ok": False, "error": "PIN já cadastrado"}), 400

    if "imagem" not in request.files:
        return jsonify({"ok": False, "error": "Imagem obrigatória"}), 400
    f = request.files["imagem"]
    if f.filename == "":
        return jsonify({"ok": False, "error": "Imagem obrigatória"}), 400

    filename = secure_filename(f.filename)
    filename = f"{pin}_{filename}"
    path = UPLOAD_DIR / filename
    f.save(path)

    # create user record; credential will be added by webauthn registration
    users = load_users()
    new_user = {
        "pin": pin,
        "imagem": filename,
        "credential_id": None,
        "public_key": None,
        "sign_count": 0
    }
    users.append(new_user)
    save_users(users)
    # return index of user (we'll use pin as identifier on client)
    return jsonify({"ok": True, "pin": pin})

# --------------- API: login via PIN -----------------
@app.route("/api/login_pin", methods=["POST"])
def api_login_pin():
    data = request.get_json()
    pin = data.get("pin")
    if not pin:
        return jsonify({"ok": False, "error": "PIN required"}), 400
    user = find_user_by_pin(pin)
    if not user:
        return jsonify({"ok": False, "error": "PIN inválido"}), 404
    image_url = url_for("uploaded", fn=user["imagem"])
    return jsonify({"ok": True, "imageUrl": image_url})

# --------------- WebAuthn: register options -----------------
@app.route("/webauthn/register/options", methods=["POST"])
def webauthn_register_options():
    body = request.get_json()
    pin = body.get("pin")  # use PIN as simple user identifier
    if not pin:
        return jsonify({"error": "pin required"}), 400
    # find user by pin (must be previously created)
    user = find_user_by_pin(pin)
    if not user:
        return jsonify({"error": "user not found"}), 404

    user_entity = PublicKeyCredentialUserEntity(
        id=pin.encode("utf-8"), name=pin, display_name=pin
    )
    # gather existing credentials for this PIN (usually none)
    creds = []
    registration_data, state = server.register_begin(user_entity, creds, user_verification="discouraged")
    # save state to temp file
    state_file = STATE_DIR / f"reg_{pin}.json"
    state_file.write_text(json.dumps(state))
    # convert challenge and user.id to base64 strings for client
    publicKey = registration_data["publicKey"]
    publicKey["challenge"] = base64.urlsafe_b64encode(publicKey["challenge"]).decode("utf-8")
    publicKey["user"]["id"] = base64.urlsafe_b64encode(publicKey["user"]["id"]).decode("utf-8")
    return jsonify({"publicKey": publicKey})

# --------------- WebAuthn: register finish -----------------
@app.route("/webauthn/register/finish", methods=["POST"])
def webauthn_register_finish():
    body = request.get_json()
    pin = body.get("pin")
    att = body.get("att")
    if not pin or not att:
        return jsonify({"error": "missing params"}), 400
    state_file = STATE_DIR / f"reg_{pin}.json"
    if not state_file.exists():
        return jsonify({"error": "no state"}), 400
    state = json.loads(state_file.read_text())

    rawId = base64.urlsafe_b64decode(att["rawId"].encode("utf-8"))
    attObj = base64.urlsafe_b64decode(att["response"]["attestationObject"].encode("utf-8"))
    clientData = base64.urlsafe_b64decode(att["response"]["clientDataJSON"].encode("utf-8"))

    auth_data = server.register_complete(state, clientData, attObj)
    # store credential id and public_key (public_key is bytes-like)
    cred_b64 = base64.urlsafe_b64encode(auth_data.credential_data.credential_id).decode("utf-8")
    pubkey_b64 = base64.urlsafe_b64encode(auth_data.credential_data.public_key).decode("utf-8")
    sign_count = auth_data.sign_count or 0

    # save into user record
    users = load_users()
    for u in users:
        if u["pin"] == pin:
            u["credential_id"] = cred_b64
            u["public_key"] = pubkey_b64
            u["sign_count"] = sign_count
            break
    save_users(users)
    try:
        state_file.unlink()
    except:
        pass
    return jsonify({"ok": True})

# --------------- WebAuthn: auth options -----------------
@app.route("/webauthn/auth/options", methods=["GET"])
def webauthn_auth_options():
    users = load_users()
    allow = []
    for u in users:
        if u.get("credential_id"):
            allow.append({"id": u["credential_id"], "type": "public-key"})
    # begin authentication (server will produce a challenge)
    # note: server.authenticate_begin expects list of credential objects (bytes),
    # but we'll provide empty list and rely on allowCredentials client-side
    auth_data, state = server.authenticate_begin([], user_verification="discouraged")
    # save state
    state_file = STATE_DIR / f"auth.json"
    state_file.write_text(json.dumps(state))
    publicKey = auth_data["publicKey"]
    publicKey["challenge"] = base64.urlsafe_b64encode(publicKey["challenge"]).decode("utf-8")
    # allowCredentials should be the stored credential ids as base64 strings; return as-is
    return jsonify({"publicKey": {"challenge": publicKey["challenge"], "allowCredentials": allow, "timeout": publicKey.get("timeout", 60000)}})

# --------------- WebAuthn: auth finish -----------------
@app.route("/webauthn/auth/finish", methods=["POST"])
def webauthn_auth_finish():
    body = request.get_json()
    assertion = body.get("assertion")
    if not assertion:
        return jsonify({"error": "assertion missing"}), 400
    state_file = STATE_DIR / "auth.json"
    if not state_file.exists():
        return jsonify({"error": "state missing"}), 400
    state = json.loads(state_file.read_text())

    rawId = base64.urlsafe_b64decode(assertion["rawId"].encode("utf-8"))
    clientData = base64.urlsafe_b64decode(assertion["response"]["clientDataJSON"].encode("utf-8"))
    authData = base64.urlsafe_b64decode(assertion["response"]["authenticatorData"].encode("utf-8"))
    signature = base64.urlsafe_b64decode(assertion["response"]["signature"].encode("utf-8"))

    cred_b64 = base64.urlsafe_b64encode(rawId).decode("utf-8")
    user = find_user_by_cred(cred_b64)
    if not user:
        return jsonify({"ok": False, "error": "credential not found"}), 404

    # rebuild AttestedCredentialData from stored public key
    try:
        pubkey = base64.urlsafe_b64decode(user["public_key"].encode("utf-8"))
        credential = AttestedCredentialData(pubkey, rawId, b"")  # constructor accepts (public_key, credential_id, aaguid?) try this
    except Exception as e:
        # older python-fido2 versions may require different constructor - try alternative
        try:
            credential = AttestedCredentialData(rawId, pubkey, b"")
        except Exception as e2:
            return jsonify({"ok": False, "error": f"credential rebuild error: {e} / {e2}"}), 500

    try:
        auth_result = server.authenticate_complete(state, [credential], rawId, clientData, authData, signature)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    # update counter
    users = load_users()
    for u in users:
        if u.get("credential_id") == cred_b64:
            u["sign_count"] = auth_result.new_sign_count
            image = u["imagem"]
            break
    save_users(users)
    try:
        state_file.unlink()
    except:
        pass
    image_url = url_for("uploaded", fn=image)
    return jsonify({"ok": True, "imageUrl": image_url})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
