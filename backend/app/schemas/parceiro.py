# backend/app/schemas/parceiro.py
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ParceiroCreateSchema(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    telefone: str = Field(..., min_length=8, max_length=20)
    empresa: str = Field(..., min_length=2, max_length=150)
    cidade: str = Field(..., min_length=2, max_length=100)
    endereco: str = Field(..., min_length=3, max_length=200)
    site: Optional[str] = Field(default=None, max_length=200)
    # Campo isca (honeypot): invisivel para pessoas, preenchido por robos.
    contato_extra: Optional[str] = None


class ParceiroCriadoSchema(BaseModel):
    parceiro_id: int
