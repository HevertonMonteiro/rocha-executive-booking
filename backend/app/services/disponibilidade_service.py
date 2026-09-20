# backend/app/services/disponibilidade_service.py
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models import Reserva, Rota, StatusReserva, TipoTrajeto

# Reservas nesses status ainda "seguram" o veiculo na agenda.
# Uma reserva cancelada libera o horario de volta.
STATUS_OCUPA_AGENDA = (
    StatusReserva.PENDENTE,
    StatusReserva.PAGO,
    StatusReserva.CONFIRMADO,
    StatusReserva.FINALIZADO,
)


def _janela_ocupacao(
    data_ida: datetime,
    tempo_estimado_minutos: Optional[int],
    tipo_trajeto: TipoTrajeto,
    data_volta: Optional[datetime],
) -> tuple[datetime, datetime]:
    """
    Calcula o intervalo em que o veiculo fica indisponivel para outras reservas.

    Regra: apos deixar o passageiro, o veiculo precisa voltar ao ponto de
    partida (mesma duracao da viagem) mais uma margem de seguranca antes de
    poder assumir a proxima corrida.
    """
    duracao = timedelta(minutes=tempo_estimado_minutos or 0)
    margem = timedelta(minutes=settings.MARGEM_RETORNO_MINUTOS)

    if tipo_trajeto == TipoTrajeto.RETURN and data_volta is not None:
        # O veiculo so fica livre apos a volta + o trajeto de retorno ao ponto de partida.
        fim = data_volta + duracao + margem
    else:
        # So ida: precisa ir e voltar ao ponto de partida antes da proxima corrida.
        fim = data_ida + (duracao * 2) + margem

    return data_ida, fim


def _sobrepoe(inicio_a: datetime, fim_a: datetime, inicio_b: datetime, fim_b: datetime) -> bool:
    return inicio_a < fim_b and inicio_b < fim_a


def _reservas_ativas_do_veiculo(db: Session, veiculo_id: int, excluir_reserva_id: Optional[int] = None):
    stmt = (
        select(Reserva)
        .options(joinedload(Reserva.rota))
        .where(
            Reserva.veiculo_id == veiculo_id,
            Reserva.status.in_(STATUS_OCUPA_AGENDA),
        )
    )
    if excluir_reserva_id is not None:
        stmt = stmt.where(Reserva.id != excluir_reserva_id)
    return db.execute(stmt).scalars().unique().all()


def verificar_disponibilidade(
    db: Session,
    veiculo_id: int,
    data_ida: datetime,
    tempo_estimado_minutos: Optional[int],
    tipo_trajeto: TipoTrajeto = TipoTrajeto.ONE_WAY,
    data_volta: Optional[datetime] = None,
    excluir_reserva_id: Optional[int] = None,
) -> bool:
    """Retorna True se o veiculo (categoria) estiver livre nesse horario."""
    inicio_solicitado, fim_solicitado = _janela_ocupacao(
        data_ida, tempo_estimado_minutos, tipo_trajeto, data_volta
    )

    for reserva in _reservas_ativas_do_veiculo(db, veiculo_id, excluir_reserva_id):
        inicio_existente, fim_existente = _janela_ocupacao(
            reserva.data_ida,
            reserva.rota.tempo_estimado_minutos if reserva.rota else None,
            reserva.tipo_trajeto,
            reserva.data_volta,
        )
        if _sobrepoe(inicio_solicitado, fim_solicitado, inicio_existente, fim_existente):
            return False

    return True


def sugerir_proximo_horario(
    db: Session,
    veiculo_id: int,
    data_ida: datetime,
    tempo_estimado_minutos: Optional[int],
    tipo_trajeto: TipoTrajeto = TipoTrajeto.ONE_WAY,
    data_volta: Optional[datetime] = None,
    excluir_reserva_id: Optional[int] = None,
    limite_tentativas: int = 50,
) -> Optional[datetime]:
    """
    Encontra o proximo horario livre para esse veiculo a partir de data_ida,
    pulando por cima de cada reserva conflitante ate achar uma folga.
    """
    duracao_pedido = data_volta - data_ida if (tipo_trajeto == TipoTrajeto.RETURN and data_volta) else None

    reservas = _reservas_ativas_do_veiculo(db, veiculo_id, excluir_reserva_id)
    janelas = sorted(
        (
            _janela_ocupacao(
                r.data_ida,
                r.rota.tempo_estimado_minutos if r.rota else None,
                r.tipo_trajeto,
                r.data_volta,
            )
            for r in reservas
        ),
        key=lambda janela: janela[0],
    )

    candidato_ida = data_ida
    for _ in range(limite_tentativas):
        candidato_volta = candidato_ida + duracao_pedido if duracao_pedido else None
        inicio_c, fim_c = _janela_ocupacao(
            candidato_ida, tempo_estimado_minutos, tipo_trajeto, candidato_volta
        )

        conflito = next(
            (janela for janela in janelas if _sobrepoe(inicio_c, fim_c, janela[0], janela[1])),
            None,
        )
        if conflito is None:
            return candidato_ida

        # Pula para o fim da janela conflitante e tenta de novo.
        candidato_ida = conflito[1]

    return None
