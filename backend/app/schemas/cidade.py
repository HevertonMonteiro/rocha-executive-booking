# backend/app/schemas/cidade.py
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CidadeSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    tipo: Optional[str] = None          # "aeroporto" | "cidade" | "parque" | "estacao"
    codigo_iata: Optional[str] = None   # ex.: "CDG", "ORY", "NCE", "MRS"
    regiao_id: int


class CidadeAutocompleteSchema(CidadeSchema):
    """CidadeSchema + slug da regiao (usado no autocomplete do frontend)."""

    regiao: str  # "ile-de-france" | "bouches-du-rhone" | "alpes-maritimes"
