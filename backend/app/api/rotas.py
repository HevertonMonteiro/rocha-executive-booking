# backend/app/api/rotas.py
from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models import Rota, TipoTrajeto
from app.schemas.rota import RotaResponseSchema
from app.services.disponibilidade_service import (
    sugerir_proximo_horario,
    verificar_disponibilidade,
)

router = APIRouter()


@router.get("/rotas", response_model=list[RotaResponseSchema])
def listar_rotas(
    origem_id: int = Query(..., gt=0, description="ID da cidade de origem"),
    destino_id: int = Query(..., gt=0, description="ID da cidade de destino"),
    data_ida: Optional[datetime] = Query(
        default=None, description="Se informada, checa disponibilidade do veiculo nesse horario"
    ),
    tipo_trajeto: Literal["one_way", "return"] = Query(default="one_way"),
    data_volta: Optional[datetime] = Query(default=None),
    db: Session = Depends(get_db),
) -> list[RotaResponseSchema]:
    if origem_id == destino_id:
        raise HTTPException(
            status_code=400,
            detail="Origem e destino devem ser diferentes.",
        )

    stmt = (
        select(Rota)
        .options(
            joinedload(Rota.origem),
            joinedload(Rota.destino),
            joinedload(Rota.veiculo),
        )
        .where(
            Rota.origem_id == origem_id,
            Rota.destino_id == destino_id,
            Rota.ativo.is_(True),
        )
        .order_by(Rota.preco_fixo)  # mais barato primeiro — padrao em booking engines
    )

    rotas = db.execute(stmt).scalars().unique().all()

    if not rotas:
        raise HTTPException(
            status_code=404,
            detail="Nenhuma rota disponivel para esta combinacao de origem/destino.",
        )

    if data_ida is None:
        return [RotaResponseSchema.model_validate(rota) for rota in rotas]

    trajeto_enum = TipoTrajeto.RETURN if tipo_trajeto == "return" else TipoTrajeto.ONE_WAY

    resultado = []
    for rota in rotas:
        schema = RotaResponseSchema.model_validate(rota)
        schema.disponivel = verificar_disponibilidade(
            db,
            veiculo_id=rota.veiculo_id,
            data_ida=data_ida,
            tempo_estimado_minutos=rota.tempo_estimado_minutos,
            tipo_trajeto=trajeto_enum,
            data_volta=data_volta,
        )
        if not schema.disponivel:
            schema.proximo_horario_disponivel = sugerir_proximo_horario(
                db,
                veiculo_id=rota.veiculo_id,
                data_ida=data_ida,
                tempo_estimado_minutos=rota.tempo_estimado_minutos,
                tipo_trajeto=trajeto_enum,
                data_volta=data_volta,
            )
        resultado.append(schema)

    return resultado
