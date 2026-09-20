# backend/app/api/parceiros.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Parceiro
from app.schemas.parceiro import ParceiroCreateSchema, ParceiroCriadoSchema

router = APIRouter()


@router.post("/parceiros", response_model=ParceiroCriadoSchema, status_code=201)
def cadastrar_parceiro(
    payload: ParceiroCreateSchema,
    db: Session = Depends(get_db),
) -> ParceiroCriadoSchema:
    # Robo preencheu o campo isca: finge sucesso sem gravar nada.
    if payload.contato_extra:
        return ParceiroCriadoSchema(parceiro_id=0)

    email = payload.email.strip().lower()
    ja_existe = db.execute(
        select(Parceiro.id).where(func.lower(Parceiro.email) == email)
    ).first()
    if ja_existe:
        raise HTTPException(status_code=409, detail="Ja existe um cadastro com este e-mail.")

    parceiro = Parceiro(
        nome=payload.nome.strip(),
        email=email,
        telefone=payload.telefone.strip(),
        empresa=payload.empresa.strip(),
        cidade=payload.cidade.strip(),
        endereco=payload.endereco.strip(),
        site=(payload.site or "").strip() or None,
    )
    db.add(parceiro)
    db.commit()
    db.refresh(parceiro)
    return ParceiroCriadoSchema(parceiro_id=parceiro.id)
