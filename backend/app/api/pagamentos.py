# backend/app/api/pagamentos.py
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models import Reserva, Rota, StatusReserva
from app.services.sumup_service import criar_checkout_sumup

router = APIRouter()


class CheckoutRequestSchema(BaseModel):
    reserva_id: int


class CheckoutResponseSchema(BaseModel):
    checkout_id: str


@router.post("/pagamentos/sumup/checkout", response_model=CheckoutResponseSchema)
async def criar_checkout(
    payload: CheckoutRequestSchema,
    db: Session = Depends(get_db),
) -> CheckoutResponseSchema:
    # Busca a reserva ja carregando rota (com origem/destino) e cliente em 1 query
    stmt = (
        select(Reserva)
        .options(
            joinedload(Reserva.rota).joinedload(Rota.origem),
            joinedload(Reserva.rota).joinedload(Rota.destino),
            joinedload(Reserva.cliente),
        )
        .where(Reserva.id == payload.reserva_id)
    )
    reserva = db.execute(stmt).scalars().unique().one_or_none()

    if reserva is None:
        raise HTTPException(status_code=404, detail="Reserva nao encontrada.")

    if reserva.status in (StatusReserva.PAGO, StatusReserva.CONFIRMADO):
        raise HTTPException(status_code=409, detail="Esta reserva ja foi paga.")

    # checkout_reference unico por tentativa (a SumUp rejeita duplicados)
    checkout_reference = f"ROCHA-{reserva.id}-{uuid.uuid4().hex[:8].upper()}"

    checkout_id = await criar_checkout_sumup(reserva, checkout_reference)

    reserva.sumup_checkout_id = checkout_id
    db.commit()

    return CheckoutResponseSchema(checkout_id=checkout_id)
