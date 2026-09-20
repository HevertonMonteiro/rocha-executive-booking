# backend/app/models/__init__.py
import enum

from sqlalchemy import (
    DECIMAL,
    TIMESTAMP,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TipoTrajeto(str, enum.Enum):
    ONE_WAY = "one_way"
    RETURN = "return"


class StatusReserva(str, enum.Enum):
    PENDENTE = "pendente"
    PAGO = "pago"
    CONFIRMADO = "confirmado"
    CANCELADO = "cancelado"
    FINALIZADO = "finalizado"


class TipoCidade(str, enum.Enum):
    AEROPORTO = "aeroporto"
    CIDADE = "cidade"
    PARQUE = "parque"
    ESTACAO = "estacao"


class IdiomaPreferido(str, enum.Enum):
    PT = "pt"
    EN = "en"
    FR = "fr"
    ES = "es"


class Regiao(Base):
    __tablename__ = "regioes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)

    cidades = relationship("Cidade", back_populates="regiao", cascade="all, delete-orphan")


class Cidade(Base):
    __tablename__ = "cidades"

    id = Column(Integer, primary_key=True, index=True)
    regiao_id = Column(Integer, ForeignKey("regioes.id"), nullable=False)
    nome = Column(String(100), nullable=False)
    tipo = Column(Enum(TipoCidade), default=TipoCidade.CIDADE)
    codigo_iata = Column(String(10), nullable=True)

    regiao = relationship("Regiao", back_populates="cidades")
    rotas_origem = relationship("Rota", foreign_keys="Rota.origem_id", back_populates="origem")
    rotas_destino = relationship("Rota", foreign_keys="Rota.destino_id", back_populates="destino")


class Veiculo(Base):
    __tablename__ = "veiculos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(50), nullable=False)
    slug = Column(String(50), nullable=False, unique=True)
    capacidade_passageiros = Column(Integer, nullable=False)
    capacidade_malas = Column(Integer, nullable=False)
    descricao = Column(Text, nullable=True)
    imagem_url = Column(String(255), nullable=True)
    preco_base = Column(DECIMAL(10, 2), nullable=False)

    rotas = relationship("Rota", back_populates="veiculo")


class Rota(Base):
    __tablename__ = "rotas"

    id = Column(Integer, primary_key=True, index=True)
    origem_id = Column(Integer, ForeignKey("cidades.id"), nullable=False)
    destino_id = Column(Integer, ForeignKey("cidades.id"), nullable=False)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False)
    preco_fixo = Column(DECIMAL(10, 2), nullable=False)
    tempo_estimado_minutos = Column(Integer, nullable=True)
    ativo = Column(Boolean, default=True)

    origem = relationship("Cidade", foreign_keys=[origem_id], back_populates="rotas_origem")
    destino = relationship("Cidade", foreign_keys=[destino_id], back_populates="rotas_destino")
    veiculo = relationship("Veiculo", back_populates="rotas")
    reservas = relationship("Reserva", back_populates="rota")


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    telefone = Column(String(20), nullable=False)
    idioma_preferido = Column(Enum(IdiomaPreferido), default=IdiomaPreferido.PT)
    created_at = Column(TIMESTAMP, server_default=func.now())

    reservas = relationship("Reserva", back_populates="cliente")


class Motorista(Base):
    __tablename__ = "motoristas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    telefone = Column(String(20), nullable=False)
    email = Column(String(100), nullable=True)
    idiomas = Column(String(50), nullable=True)
    veiculo_atual_id = Column(Integer, ForeignKey("veiculos.id"), nullable=True)
    disponivel = Column(Boolean, default=True)

    veiculo = relationship("Veiculo")
    atribuicoes = relationship("ReservaMotorista", back_populates="motorista")


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    rota_id = Column(Integer, ForeignKey("rotas.id"), nullable=False)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False)
    tipo_trajeto = Column(Enum(TipoTrajeto), default=TipoTrajeto.ONE_WAY)
    data_ida = Column(DateTime, nullable=False)
    data_volta = Column(DateTime, nullable=True)
    numero_voo = Column(String(20), nullable=True)
    numero_voo_volta = Column(String(20), nullable=True)
    quantidade_passageiros = Column(Integer, default=1)
    observacoes = Column(Text, nullable=True)
    preco_total = Column(DECIMAL(10, 2), nullable=False)
    status = Column(Enum(StatusReserva), default=StatusReserva.PENDENTE)
    sumup_checkout_id = Column(String(100), nullable=True)
    sumup_transaction_id = Column(String(100), nullable=True)
    data_pagamento = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="reservas")
    rota = relationship("Rota", back_populates="reservas")
    veiculo = relationship("Veiculo")
    atribuicoes = relationship("ReservaMotorista", back_populates="reserva")
    logs = relationship("PagamentoLog", back_populates="reserva")


class ReservaMotorista(Base):
    __tablename__ = "reserva_motoristas"

    id = Column(Integer, primary_key=True, index=True)
    reserva_id = Column(Integer, ForeignKey("reservas.id"), nullable=False)
    motorista_id = Column(Integer, ForeignKey("motoristas.id"), nullable=False)
    atribuido_em = Column(TIMESTAMP, server_default=func.now())

    reserva = relationship("Reserva", back_populates="atribuicoes")
    motorista = relationship("Motorista", back_populates="atribuicoes")


class PagamentoLog(Base):
    __tablename__ = "pagamento_logs"

    id = Column(Integer, primary_key=True, index=True)
    reserva_id = Column(Integer, ForeignKey("reservas.id"), nullable=True)
    sumup_evento = Column(String(50), nullable=False)
    payload = Column(Text, nullable=False)
    recebido_em = Column(TIMESTAMP, server_default=func.now())

    reserva = relationship("Reserva", back_populates="logs")


class Parceiro(Base):
    __tablename__ = "parceiros"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, index=True)
    telefone = Column(String(20), nullable=False)
    empresa = Column(String(150), nullable=False)
    cidade = Column(String(100), nullable=False)
    endereco = Column(String(200), nullable=False)
    site = Column(String(200), nullable=True)
    status = Column(String(20), nullable=False, default="pendente")
    created_at = Column(TIMESTAMP, server_default=func.now())
