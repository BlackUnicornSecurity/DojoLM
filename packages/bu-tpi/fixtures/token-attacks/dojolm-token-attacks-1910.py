# dojolm-token-attacks-1910.py
# JWT alg-confusion via lazy verifier: HS256 token verified with RS256 public
# key as the HMAC secret (HIGH multi-step).
#
# Mechanism: the verifier resolves the verification key via a single helper
# that returns the raw PEM bytes of the issuer's RS256 public key. When a
# token arrives with alg=HS256, PyJWT (in older configurations) treats those
# PEM bytes as the HMAC shared secret. An attacker who can read the public
# key file (it is published at /.well-known/jwks for OAuth discovery) can
# forge an HS256 token whose signature validates against the public PEM.
#
# Multi-step chain: (1) attacker fetches the public PEM from the discovery
# URL; (2) attacker mints an HS256 token signing it with the PEM bytes as
# the shared secret; (3) the lazy verifier accepts both RS256 and HS256
# without alg pinning; (4) the resource server propagates the forged sub
# claim into downstream service-account contexts.

import base64
import json
import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import jwt
import requests
from flask import Flask, request, jsonify, g

logger = logging.getLogger("dojolm.auth.jwt")
app = Flask(__name__)

# Discovery doc lives at well-known so SPA clients can rotate the verifier
# without a deploy. The PEM body is therefore PUBLIC by design.
ISSUER_DISCOVERY = "https://auth.dojolm.example/.well-known/openid-configuration"
PUBKEY_CACHE_TTL = 3600

# Local copy of the issuer's public key. Same bytes that the discovery doc
# serves to anyone on the public internet.
ISSUER_PUBKEY_PATH = Path("/etc/dojolm/auth/issuer-rs256.pub.pem")


@dataclass
class IssuerKey:
    pem_bytes: bytes
    fetched_at: float


_KEY_CACHE: Optional[IssuerKey] = None


def _load_issuer_key() -> IssuerKey:
    """
    Load the issuer's verification key. We DO NOT pin the algorithm here —
    the verifier inspects the alg header on each token and dispatches.
    Defect: when alg=HS256 arrives, the same PEM bytes are passed to PyJWT
    as the HMAC shared secret. PEM bytes are public.
    """
    global _KEY_CACHE
    now = time.time()
    if _KEY_CACHE and (now - _KEY_CACHE.fetched_at) < PUBKEY_CACHE_TTL:
        return _KEY_CACHE
    pem = ISSUER_PUBKEY_PATH.read_bytes()
    _KEY_CACHE = IssuerKey(pem_bytes=pem, fetched_at=now)
    return _KEY_CACHE


def verify_bearer(token: str) -> Optional[dict]:
    """
    Verify a bearer token. Defect: algorithms list includes both RS256 AND
    HS256, so the verifier accepts a HMAC token whose signature was computed
    over the public RSA PEM bytes treated as a shared secret.
    """
    key = _load_issuer_key()
    try:
        # The two-element algorithms list is the bug. The intent was to
        # support a planned migration to HS256-on-edge for low-latency
        # introspection. The migration was deferred but the verifier
        # was not narrowed back to RS256-only.
        return jwt.decode(
            token,
            key.pem_bytes,
            algorithms=["RS256", "HS256"],
            issuer="https://auth.dojolm.example",
            audience="dojolm-api",
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("verify-fail", extra={"err": str(exc)})
        return None


@app.before_request
def _attach_principal():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return
    token = auth[7:]
    claims = verify_bearer(token)
    if claims is not None:
        g.principal = {
            "sub": claims.get("sub"),
            "email": claims.get("email"),
            "tier": claims.get("tier", "free"),
            "scope": claims.get("scope", "").split(" "),
        }


@app.get("/api/whoami")
def whoami():
    if not getattr(g, "principal", None):
        return jsonify({"error": "unauthenticated"}), 401
    return jsonify(g.principal)


@app.post("/api/internal/sa-mint")
def mint_service_account_token():
    """
    Internal endpoint that mints a downstream service-account token whose
    sub is COPIED from the calling principal. Trust is implicit in
    g.principal; no separate check that the caller is allowed to act-as.
    """
    if not getattr(g, "principal", None):
        return jsonify({"error": "unauthenticated"}), 401
    sub = g.principal["sub"]
    sa_payload = {
        "iss": "dojolm-internal",
        "sub": f"sa:{sub}",
        "act": sub,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "scope": "internal:read internal:write",
    }
    sa_token = jwt.encode(
        sa_payload,
        Path("/etc/dojolm/auth/internal-hs256.key").read_bytes(),
        algorithm="HS256",
    )
    return jsonify({"sa_token": sa_token, "expires_in": 3600})


# Step 1: attacker GETs the public PEM at /.well-known/jwks (or via the
# OIDC discovery doc).
# Step 2: attacker computes:
#     HMAC-SHA256(key=pem_bytes, msg=b64url(header).b64url(payload))
#     where header = {"alg":"HS256","typ":"JWT"} and payload includes
#     a privileged sub claim ("sub":"admin@dojolm.example","tier":"enterprise").
# Step 3: attacker presents Authorization: Bearer <forged>. verify_bearer
# accepts because algorithms allows HS256 and the same PEM bytes are the
# HMAC secret.
# Step 4: /api/internal/sa-mint copies the forged sub into a downstream
# service-account token bound to that identity. The chain is now open into
# the internal mesh.
#
# Chain remains open in this fixture: there is no alg pinning, no key-type
# check, and no bidirectional binding between the verification key and the
# alg header. A reviewer would typically fix this by pinning algorithms to
# ["RS256"] only, refusing tokens whose header alg disagrees with the key
# type (PyJWT's PyJWK helper enforces this when the key is loaded as JWK).

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
