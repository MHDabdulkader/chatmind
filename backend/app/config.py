import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", extra="ignore")

  openrouter_api_key : str = ""
  google_api_key : str = ""
  tavily_api_key : str = ""
  default_model : str = "gemini-3.5-flash-lite"
  embedding_model : str = "BAAI/bge-small-en-v1.5"
  reranker_model: str = "ms-marco-TinyBERT-L-2-v2"
  rerank_enabled: bool = True
  database_url : str = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "sqlite:///./data/app.db"
  chroma_dir: str = "./data/chroma_db"
  upload_dir: str = "./data/uploads"
  cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,*"

  @property
  def origins(self) -> list[str]:
    if "*" in [o.strip() for o in self.cors_origins.split(",")]:
      return ["*"]
    return [o.strip() for o in self.cors_origins.split(",") if o.strip()]




settings = Settings()

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")



