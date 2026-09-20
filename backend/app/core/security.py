# backend/app/core/security.py
import base64
import hashlib
import hmac
import os
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlparse

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

COOKIE_SESSAO = "admin_session"

_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2**14, 8, 1
_MIN_SENHA = 12


# ---------------------------------------------------------------------------
# Senhas (scrypt, com salt aleatorio por senha)
# ---------------------------------------------------------------------------
def validar_forca_senha(senha: str) -> None:
    if len(senha) < _MIN_SENHA:
        raise ValueError(f"A senha deve ter pelo menos {_MIN_SENHA} caracteres.")


def hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(senha.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P)
    return "scrypt${}${}".format(
        base64.b64encode(salt).decode(), base64.b64encode(digest).decode()
    )


# Hash valido usado para gastar o mesmo tempo quando o e-mail nao existe
# (evita descobrir e-mails cadastrados medindo o tempo de resposta).
_HASH_FALSO = hash_senha("senha-descartavel-para-tempo-constante")


def verificar_senha(senha: str, armazenado: Optional[str]) -> bool:
    try:
        _, salt_b64, hash_b64 = (armazenado or _HASH_FALSO).split("$")
        salt, esperado = base64.b64decode(salt_b64), base64.b64decode(hash_b64)
        calculado = hashlib.scrypt(
            senha.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P
        )
    except Exception:
        return False
    return hmac.compare_digest(calculado, esperado) and armazenado is not None


# ---------------------------------------------------------------------------
# Sessao: JWT assinado, guardado em cookie HttpOnly (inacessivel ao JavaScript)
# ---------------------------------------------------------------------------
def criar_token(admin_id: int) -> str:
    if not settings.JWT_SECRET:
        raise HTTPException(status_code=503, detail="Autenticacao nao configurada no servidor.")
    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin_id),
        "iat": agora,
        "exp": agora + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def admin_atual(request: Request, db: Session = Depends(get_db)):
    """Dependencia que protege todas as rotas /api/admin/*."""
    from app.models import Admin  # evita import circular

    nao_autorizado = HTTPException(status_code=401, detail="Sessao invalida ou expirada.")
    token = request.cookies.get(COOKIE_SESSAO)
    if not token or not settings.JWT_SECRET:
        raise nao_autorizado
    try:
        dados = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        admin = db.get(Admin, int(dados["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise nao_autorizado
    if admin is None or not admin.ativo:
        raise nao_autorizado
    request.state.admin_id = admin.id
    return admin


def verificar_origem(request: Request) -> None:
    """
    Defesa extra contra CSRF (alem do cookie SameSite=Strict): requisicoes que
    alteram dados so sao aceitas se vierem do proprio site.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return
    origem = request.headers.get("origin")
    if not origem:
        referer = request.headers.get("referer")
        if referer:
            partes = urlparse(referer)
            origem = f"{partes.scheme}://{partes.netloc}"
    if not origem or origem.rstrip("/") not in settings.origens_confiaveis:
        raise HTTPException(status_code=403, detail="Origem da requisicao nao autorizada.")


# ---------------------------------------------------------------------------
# Limite de requisicoes (em memoria; por processo).
# Em producao com varias instancias, trocar por Redis (mesma interface).
# ---------------------------------------------------------------------------
class LimitadorDeTaxa:
    def __init__(self) -> None:
        self._eventos: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def _limpar(self, chave: str, janela_seg: float) -> deque:
        fila = self._eventos[chave]
        limite = time.monotonic() - janela_seg
        while fila and fila[0] < limite:
            fila.popleft()
        return fila

    def excedeu(self, chave: str, maximo: int, janela_seg: float) -> bool:
        with self._lock:
            return len(self._limpar(chave, janela_seg)) >= maximo

    def registrar(self, chave: str, janela_seg: float) -> None:
        with self._lock:
            self._limpar(chave, janela_seg).append(time.monotonic())

    def zerar(self, chave: str) -> None:
        with self._lock:
            self._eventos.pop(chave, None)


limitador = LimitadorDeTaxa()


def ip_do_cliente(request: Request) -> str:
    return request.client.host if request.client else "desconhecido"


def limitar_publico(nome: str, maximo: int = 10, janela_seg: int = 60):
    """Dependencia para endpoints publicos que gravam dados (evita spam/abuso)."""

    def _dependencia(request: Request) -> None:
        chave = f"pub:{nome}:{ip_do_cliente(request)}"
        if limitador.excedeu(chave, maximo, janela_seg):
            raise HTTPException(status_code=429, detail="Muitas requisicoes. Tente novamente em instantes.")
        limitador.registrar(chave, janela_seg)

    return _dependencia
