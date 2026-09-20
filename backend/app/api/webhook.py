# backend/app/api/webhook.py
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import PagamentoLog, Reserva, StatusReserva
from app.services.sumup_service import verificar_checkout_pago

router = APIRouter()


@router.post("/webhook/sumup", status_code=200)
async def webhook_sumup(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await request.json()
    event_type = payload.get("event_type", "unknown")

    # Registra TUDO no log — essencial para auditoria e debug
    log = PagamentoLog(
        reserva_id=None,
        sumup_evento=event_type,
        payload=json.dumps(payload, ensure_ascii=False),
    )
    db.add(log)

    if event_type == "checkout.paid":
        checkout_id = payload.get("id") or payload.get("checkout_id")

        if checkout_id:
            reserva = db.execute(
                select(Reserva).where(Reserva.sumup_checkout_id == checkout_id)
            ).scalar_one_or_none()

            if reserva is not None:
                log.reserva_id = reserva.id
                # Idempotencia: se ja esta pago, nao reprocessa
                if reserva.status not in (StatusReserva.PAGO, StatusReserva.CONFIRMADO):
                    # Nao confia no payload do webhook: confirma o pagamento
                    # diretamente na API da SumUp antes de marcar como pago.
                    pago, transaction_id = await verificar_checkout_pago(checkout_id)
                    if pago:
                        reserva.status = StatusReserva.PAGO
                        reserva.sumup_transaction_id = transaction_id
                        reserva.data_pagamento = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    # Sempre 200: se retornar erro, a SumUp fica reenviando o webhook
    return {"received": True}
