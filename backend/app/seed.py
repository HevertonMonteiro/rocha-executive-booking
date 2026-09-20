# backend/app/seed.py
"""
Popula o banco com regioes, cidades, veiculos e rotas de exemplo.
Uso:  python -m app.seed
Idempotente: se ja existir qualquer regiao cadastrada, nao faz nada.
"""

from sqlalchemy import func, select

from app.core.database import Base, SessionLocal, engine
from app.models import Cidade, Regiao, Rota, TipoCidade, Veiculo


def run() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        total = db.scalar(select(func.count()).select_from(Regiao))
        if total and total > 0:
            print("Banco ja populado. Seed ignorado.")
            return

        # ------------------------------------------------------------------
        # Regioes
        # ------------------------------------------------------------------
        idf = Regiao(nome="Île-de-France", slug="ile-de-france")
        bdr = Regiao(nome="Bouches-du-Rhône", slug="bouches-du-rhone")
        am = Regiao(nome="Alpes-Maritimes", slug="alpes-maritimes")
        db.add_all([idf, bdr, am])
        db.flush()

        # ------------------------------------------------------------------
        # Cidades
        # ------------------------------------------------------------------
        cdg = Cidade(regiao_id=idf.id, nome="Aeroporto Charles de Gaulle (CDG)",
                     tipo=TipoCidade.AEROPORTO, codigo_iata="CDG")
        ory = Cidade(regiao_id=idf.id, nome="Aeroporto de Orly (ORY)",
                     tipo=TipoCidade.AEROPORTO, codigo_iata="ORY")
        paris = Cidade(regiao_id=idf.id, nome="Paris (Centro)", tipo=TipoCidade.CIDADE)
        disney = Cidade(regiao_id=idf.id, nome="Disneyland Paris", tipo=TipoCidade.PARQUE)
        versailles = Cidade(regiao_id=idf.id, nome="Versailles", tipo=TipoCidade.CIDADE)
        gare_nord = Cidade(regiao_id=idf.id, nome="Gare du Nord (Paris)",
                           tipo=TipoCidade.ESTACAO)

        mrs = Cidade(regiao_id=bdr.id, nome="Aeroporto Marseille Provence (MRS)",
                     tipo=TipoCidade.AEROPORTO, codigo_iata="MRS")
        marseille = Cidade(regiao_id=bdr.id, nome="Marseille (Centro)", tipo=TipoCidade.CIDADE)
        aix = Cidade(regiao_id=bdr.id, nome="Aix-en-Provence", tipo=TipoCidade.CIDADE)
        st_charles = Cidade(regiao_id=bdr.id, nome="Gare Saint-Charles (Marseille)",
                            tipo=TipoCidade.ESTACAO)

        nce = Cidade(regiao_id=am.id, nome="Aeroporto Nice Côte d'Azur (NCE)",
                     tipo=TipoCidade.AEROPORTO, codigo_iata="NCE")
        nice = Cidade(regiao_id=am.id, nome="Nice (Centro)", tipo=TipoCidade.CIDADE)
        cannes = Cidade(regiao_id=am.id, nome="Cannes", tipo=TipoCidade.CIDADE)
        antibes = Cidade(regiao_id=am.id, nome="Antibes", tipo=TipoCidade.CIDADE)

        db.add_all([cdg, ory, paris, disney, versailles, gare_nord,
                    mrs, marseille, aix, st_charles,
                    nce, nice, cannes, antibes])

        # ------------------------------------------------------------------
        # Veiculos
        # ------------------------------------------------------------------
        hatch = Veiculo(
            nome="Toyota Hatchback", slug="toyota-hatchback",
            capacidade_passageiros=4, capacidade_malas=3,
            descricao="Opcao economica e confortavel para ate 4 passageiros.",
            imagem_url=None, preco_base=45,
        )
        sedan = Veiculo(
            nome="Mercedes Sedan", slug="mercedes-sedan",
            capacidade_passageiros=3, capacidade_malas=3,
            descricao="Sedan executivo Mercedes-Benz com motorista bilíngue.",
            imagem_url=None, preco_base=65,
        )
        van = Veiculo(
            nome="Mercedes Van", slug="mercedes-van",
            capacidade_passageiros=8, capacidade_malas=10,
            descricao="Van premium para grupos de ate 8 passageiros com bagagem.",
            imagem_url=None, preco_base=85,
        )
        db.add_all([hatch, sedan, van])
        db.flush()

        # ------------------------------------------------------------------
        # Rotas (precos fixos por veiculo: hatch, sedan, van)
        # ------------------------------------------------------------------
        veiculos = (hatch, sedan, van)

        def add_rotas(origem: Cidade, destino: Cidade, precos: tuple, minutos: int) -> None:
            for veiculo, preco in zip(veiculos, precos):
                db.add(Rota(
                    origem_id=origem.id, destino_id=destino.id,
                    veiculo_id=veiculo.id, preco_fixo=preco,
                    tempo_estimado_minutos=minutos, ativo=True,
                ))

        # Ile-de-France
        add_rotas(cdg, paris, (65, 90, 110), 45)
        add_rotas(paris, cdg, (65, 90, 110), 45)
        add_rotas(ory, paris, (55, 80, 100), 40)
        add_rotas(paris, ory, (55, 80, 100), 40)
        add_rotas(cdg, disney, (85, 115, 140), 50)
        add_rotas(disney, cdg, (85, 115, 140), 50)
        add_rotas(cdg, versailles, (95, 125, 150), 60)

        # Alpes-Maritimes
        add_rotas(nce, cannes, (80, 110, 130), 40)
        add_rotas(cannes, nce, (80, 110, 130), 40)
        add_rotas(nce, nice, (45, 65, 85), 20)
        add_rotas(nice, nce, (45, 65, 85), 20)
        add_rotas(nce, antibes, (60, 85, 105), 30)

        # Bouches-du-Rhone
        add_rotas(mrs, aix, (65, 90, 110), 35)
        add_rotas(aix, mrs, (65, 90, 110), 35)
        add_rotas(mrs, marseille, (50, 70, 90), 25)
        add_rotas(marseille, mrs, (50, 70, 90), 25)
        add_rotas(st_charles, mrs, (50, 70, 90), 25)

        db.commit()
        print("Seed concluido: 3 regioes, 14 cidades, 3 veiculos, 17 rotas (x3 veiculos).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
