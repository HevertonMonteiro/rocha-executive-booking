# backend/app/schemas/reserva.py
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.schemas.rota import CidadeResumoSchema
from app.schemas.veiculo import VeiculoSchema


class ClienteCreateSchema(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    telefone: str = Field(..., min_length=8, max_length=20)
    idioma_preferido: Literal["pt", "en", "fr", "es"] = "pt"


class ReservaCreateSchema(BaseModel):
    origem_id: int = Field(..., gt=0)
    destino_id: int = Field(..., gt=0)
    veiculo_id: int = Field(..., gt=0)
    data_ida: datetime
    tipo_trajeto: Literal["one_way", "return"] = "one_way"
    data_volta: Optional[datetime] = None
    numero_voo: Optional[str] = Field(default=None, max_length=20)
    quantidade_passageiros: int = Field(default=1, ge=1, le=9)
    observacoes: Optional[str] = None

    cliente_nome: str = Field(..., min_length=2, max_length=100)
    cliente_email: EmailStr
    cliente_telefone: str = Field(..., min_length=8, max_length=20)

    @model_validator(mode="after")
    def validar_trajeto(self) -> "ReservaCreateSchema":
        if self.origem_id == self.destino_id:
            raise ValueError("Origem e destino devem ser diferentes.")
        if self.tipo_trajeto == "return" and self.data_volta is None:
            raise ValueError("data_volta e obrigatoria para trajeto ida e volta.")
        if self.data_volta and self.data_volta <= self.data_ida:
            raise ValueError("data_volta deve ser posterior a data_ida.")
        return self


class ClienteResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    telefone: str


class RotaResumoReservaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    origem: CidadeResumoSchema
    destino: CidadeResumoSchema
    preco_fixo: Decimal
    tempo_estimado_minutos: Optional[int] = None


class ReservaResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cliente: ClienteResponseSchema
    rota: RotaResumoReservaSchema
    veiculo: VeiculoSchema
    data_ida: datetime
    preco_total: Decimal
    status: str


class ReservaCriadaSchema(BaseModel):
    """Resposta enxuta do POST /reservas/criar (o frontend so precisa disso)."""

    reserva_id: int
    checkout_reference: str
    preco_total: Decimal
