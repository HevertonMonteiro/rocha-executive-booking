# backend/app/schemas/rota.py
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.veiculo import VeiculoSchema


class CidadeResumoSchema(BaseModel):
    """Versao enxuta da cidade para embutir na resposta da rota."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    codigo_iata: Optional[str] = None


class RotaResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    origem: CidadeResumoSchema
    destino: CidadeResumoSchema
    veiculo: VeiculoSchema
    preco_fixo: Decimal                    # Decimal serializa sem erro de ponto flutuante
    tempo_estimado_minutos: Optional[int] = None

    # Preenchidos somente quando a busca informa data_ida (checagem de agenda do veiculo)
    disponivel: Optional[bool] = None
    proximo_horario_disponivel: Optional[datetime] = None
