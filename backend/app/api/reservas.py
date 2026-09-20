# backend/app/api/reservas.py
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Cliente, Reserva, Rota, StatusReserva, TipoTrajeto
from app.schemas.reserva import ReservaCreateSchema, ReservaCriadaSchema
from app.services.disponibilidade_service import (
    sugerir_proximo_horario,
    verificar_disponibilidade,
)

router = APIRouter()


@router.post("/reservas/criar", response_model=ReservaCriadaSchema, status_code=201)
def criar_reserva(
    payload: ReservaCreateSchema,
    db: Session = Depends(get_db),
) -> ReservaCriadaSchema:
    # 1. Busca a rota exata (origem + destino + veiculo) e ativa
    stmt = select(Rota).where(
        Rota.origem_id == payload.origem_id,
        Rota.destino_id == payload.destino_id,
        Rota.veiculo_id == payload.veiculo_id,
        Rota.ativo.is_(True),
    )
    rota = db.execute(stmt).scalar_one_or_none()
    if rota is None:
        raise HTTPException(
            status_code=404,
            detail="Rota nao disponivel para esta combinacao de origem/destino/veiculo.",
        )

    # 2. Calcula preco total (ida e volta = 2x preco fixo)
    preco_total: Decimal = rota.preco_fixo * (
        2 if payload.tipo_trajeto == "return" else 1
    )

    # 2.1 Confirma que o veiculo continua livre nesse horario (evita corrida
    # entre duas reservas simultaneas para o mesmo veiculo/horario).
    trajeto_enum = TipoTrajeto.RETURN if payload.tipo_trajeto == "return" else TipoTrajeto.ONE_WAY
    disponivel = verificar_disponibilidade(
        db,
        veiculo_id=payload.veiculo_id,
        data_ida=payload.data_ida,
        tempo_estimado_minutos=rota.tempo_estimado_minutos,
        tipo_trajeto=trajeto_enum,
        data_volta=payload.data_volta,
    )
    if not disponivel:
        proximo = sugerir_proximo_horario(
            db,
            veiculo_id=payload.veiculo_id,
            data_ida=payload.data_ida,
            tempo_estimado_minutos=rota.tempo_estimado_minutos,
            tipo_trajeto=trajeto_enum,
            data_volta=payload.data_volta,
        )
        sugestao = f" Proximo horario disponivel: {proximo.strftime('%d/%m/%Y %H:%M')}." if proximo else ""
        raise HTTPException(
            status_code=409,
            detail=f"Este veiculo acabou de ficar indisponivel nesse horario.{sugestao}",
        )

    # 3. Cria ou recupera o cliente pelo e-mail
    cliente = db.execute(
        select(Cliente).where(Cliente.email == payload.cliente_email)
    ).scalar_one_or_none()

    if cliente is None:
        cliente = Cliente(
            nome=payload.cliente_nome,
            email=payload.cliente_email,
            telefone=payload.cliente_telefone,
        )
        db.add(cliente)
        db.flush()  # garante cliente.id sem commit
    else:
        # mantem dados de contato atualizados
        cliente.nome = payload.cliente_nome
        cliente.telefone = payload.cliente_telefone

    # 4. Cria a reserva com status PENDENTE
    reserva = Reserva(
        cliente_id=cliente.id,
        rota_id=rota.id,
        veiculo_id=payload.veiculo_id,
        tipo_trajeto=TipoTrajeto(payload.tipo_trajeto),
        data_ida=payload.data_ida,
        data_volta=payload.data_volta,
        numero_voo=payload.numero_voo,
        quantidade_passageiros=payload.quantidade_passageiros,
        observacoes=payload.observacoes,
        preco_total=preco_total,
        status=StatusReserva.PENDENTE,
    )
    db.add(reserva)
    db.commit()
    db.refresh(reserva)

    # 5. Retorna o necessario para o frontend seguir ao pagamento
    return ReservaCriadaSchema(
        reserva_id=reserva.id,
        checkout_reference=f"ROCHA-{reserva.id}",
        preco_total=reserva.preco_total,
    )
