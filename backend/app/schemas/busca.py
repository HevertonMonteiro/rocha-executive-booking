# backend/app/schemas/busca.py
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class BuscaRequestSchema(BaseModel):
    """Payload do formulario de busca do frontend (wizard de reserva)."""

    origem_id: int = Field(..., gt=0)
    destino_id: int = Field(..., gt=0)
    data_ida: str = Field(..., description="ISO 8601, ex.: 2026-09-15T14:30")
    tipo_trajeto: Literal["one_way", "return"] = "one_way"

    @model_validator(mode="after")
    def origem_diferente_destino(self) -> "BuscaRequestSchema":
        if self.origem_id == self.destino_id:
            raise ValueError("Origem e destino devem ser diferentes.")
        return self
