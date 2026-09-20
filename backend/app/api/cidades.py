# backend/app/api/cidades.py
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Cidade, Regiao
from app.schemas.cidade import CidadeAutocompleteSchema

router = APIRouter()


@router.get("/cidades", response_model=list[CidadeAutocompleteSchema])
def listar_cidades(
    q: Optional[str] = Query(
        default=None,
        min_length=1,
        max_length=100,
        description="Termo de busca: nome da cidade ou codigo IATA (case-insensitive).",
    ),
    regiao: Optional[str] = Query(
        default=None,
        description="Slug da regiao: ile-de-france | bouches-du-rhone | alpes-maritimes",
    ),
    db: Session = Depends(get_db),
) -> list[CidadeAutocompleteSchema]:
    stmt = select(Cidade, Regiao.slug).join(Regiao, Cidade.regiao_id == Regiao.id)

    if regiao:
        stmt = stmt.where(Regiao.slug == regiao)

    if q:
        termo = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Cidade.nome.ilike(termo),
                Cidade.codigo_iata.ilike(termo),
            )
        )

    # Ordena alfabeticamente e limita: autocomplete nao precisa de mais que isso
    stmt = stmt.order_by(Cidade.nome).limit(20)

    rows = db.execute(stmt).all()

    return [
        CidadeAutocompleteSchema(
            id=cidade.id,
            nome=cidade.nome,
            tipo=cidade.tipo.value if cidade.tipo else None,
            codigo_iata=cidade.codigo_iata,
            regiao_id=cidade.regiao_id,
            regiao=regiao_slug,
        )
        for cidade, regiao_slug in rows
    ]
