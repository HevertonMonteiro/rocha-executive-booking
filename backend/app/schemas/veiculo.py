# backend/app/schemas/veiculo.py
from typing import Optional

from pydantic import BaseModel, ConfigDict


class VeiculoSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    slug: str
    capacidade_passageiros: int
    capacidade_malas: int
    descricao: Optional[str] = None
    imagem_url: Optional[str] = None
