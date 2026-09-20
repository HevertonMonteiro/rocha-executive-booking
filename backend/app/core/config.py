# backend/app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # development | production. Em production a aplicacao valida a configuracao
    # e se recusa a iniciar com valores inseguros (ver validar_producao).
    ENVIRONMENT: str = "development"

    # Banco de dados
    DATABASE_URL: str = "sqlite:///./rocha_transport.db"

    # URL publica do site (usada para validar a origem das requisicoes do admin)
    SITE_URL: str = "http://localhost:3000"

    # CORS — separar multiplas origens por virgula no .env
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Hosts aceitos no cabecalho Host (protecao contra Host header injection)
    ALLOWED_HOSTS: str = "localhost,127.0.0.1,testserver"

    # SumUp
    SUMUP_API_URL: str = "https://api.sumup.com/v0.1"
    SUMUP_API_KEY: str = ""
    SUMUP_MERCHANT_CODE: str = ""
    SUMUP_PAY_TO_EMAIL: str = ""

    # Painel administrativo
    # O admin inicial e criado por `python -m app.bootstrap` (nao no start da API).
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    JWT_SECRET: str = ""
    JWT_EXPIRE_MINUTES: int = 480
    COOKIE_SECURE: bool = False  # forcado a True em production

    # Protecao contra forca bruta no login do admin
    LOGIN_MAX_TENTATIVAS: int = 5
    LOGIN_JANELA_MINUTOS: int = 15

    # Uploads de imagens (frota, destinos) servidos em /uploads
    UPLOAD_DIR: str = "uploads"
    UPLOAD_MAX_MB: int = 5

    # Reserva criada mas nao paga deixa de segurar o veiculo apos esse tempo
    HOLD_PENDENTE_MINUTOS: int = 30

    # Disponibilidade de frota
    # Apos deixar o passageiro, o veiculo precisa voltar ao ponto de partida
    # (mesma duracao da ida) mais uma margem de seguranca antes de assumir
    # outra reserva (limpeza, troca de motorista, imprevistos de transito).
    MARGEM_RETORNO_MINUTOS: int = 15

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def em_producao(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_hosts(self) -> list[str]:
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",") if host.strip()]

    @property
    def origens_confiaveis(self) -> set[str]:
        """Origens autorizadas a fazer requisicoes que alteram dados no admin."""
        return {self.SITE_URL.rstrip("/"), *(o.rstrip("/") for o in self.cors_origins)}

    @property
    def cookie_seguro(self) -> bool:
        return self.COOKIE_SECURE or self.em_producao

    def validar_producao(self) -> None:
        """Falha o start se a configuracao de production for insegura."""
        problemas: list[str] = []
        if len(self.JWT_SECRET) < 32:
            problemas.append("JWT_SECRET deve ter pelo menos 32 caracteres aleatorios.")
        if self.DATABASE_URL.startswith("sqlite"):
            problemas.append("DATABASE_URL nao pode ser SQLite em production (use PostgreSQL).")
        if not self.SITE_URL.startswith("https://"):
            problemas.append("SITE_URL deve usar https:// em production.")
        if any(not o.startswith("https://") for o in self.cors_origins):
            problemas.append("Todas as CORS_ORIGINS devem usar https:// em production.")
        if any(h in ("*", "localhost", "127.0.0.1", "testserver") for h in self.allowed_hosts):
            problemas.append("ALLOWED_HOSTS deve conter apenas o(s) dominio(s) reais em production.")
        if not self.SUMUP_API_KEY:
            problemas.append("SUMUP_API_KEY nao configurada (webhook nao consegue confirmar pagamentos).")
        if problemas:
            raise RuntimeError(
                "Configuracao insegura para production:\n - " + "\n - ".join(problemas)
            )


settings = Settings()
