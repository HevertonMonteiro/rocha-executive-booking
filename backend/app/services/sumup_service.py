# backend/app/services/sumup_service.py
from typing import Optional

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.models import Reserva


async def criar_checkout_sumup(reserva: Reserva, checkout_reference: str) -> str:
    """
    Cria um checkout na SumUp e retorna o checkout_id.
    O checkout_id e usado pelo Card Widget (frontend) para renderizar o pagamento.
    """
    payload = {
        "checkout_reference": checkout_reference,
        "amount": float(reserva.preco_total),
        "currency": "EUR",
        "merchant_code": settings.SUMUP_MERCHANT_CODE,
        "pay_to_email": settings.SUMUP_PAY_TO_EMAIL,
        "description": f"Reserva #{reserva.id} - Rocha Executive Transport",
    }

    headers = {
        "Authorization": f"Bearer {settings.SUMUP_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.post(
                f"{settings.SUMUP_API_URL}/checkouts",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Erro ao criar checkout na SumUp: {exc.response.text}",
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=502,
                detail="Nao foi possivel conectar a API da SumUp.",
            )

    data = response.json()
    checkout_id = data.get("id")
    if not checkout_id:
        raise HTTPException(status_code=502, detail="SumUp nao retornou checkout_id.")

    return checkout_id


async def verificar_checkout_pago(checkout_id: str) -> tuple[bool, Optional[str]]:
    """
    Confirma diretamente na API da SumUp se um checkout foi realmente pago.
    Usado pelo webhook para nao confiar cegamente no payload recebido
    (qualquer requisicao externa poderia forjar um evento checkout.paid).
    Retorna (pago, transaction_id).
    """
    headers = {"Authorization": f"Bearer {settings.SUMUP_API_KEY}"}

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.get(
                f"{settings.SUMUP_API_URL}/checkouts/{checkout_id}",
                headers=headers,
            )
            response.raise_for_status()
        except httpx.HTTPError:
            return False, None

    data = response.json()
    status = data.get("status")
    transaction_id = None
    transactions = data.get("transactions") or []
    if transactions:
        transaction_id = transactions[0].get("id")

    return status == "PAID", transaction_id
