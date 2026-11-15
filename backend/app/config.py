import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", extra="ignore")

  openrouter_api_key : str = ""
  default_model : str = "nvidia/nemotron-3.5-super-vl:free"
  embedding_model : str = "BAAI/bge-small-en-v1.5"
  database_url : str = "sqlite:///./data/app.db"
  chroma_dir: str = "./data/chroma_db"
  upload_dir: str = "./data/uploads"
  cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

  @property
  def origins(self) -> list[str]:
    return [o.strip() for o in self.cors_origins.split(",") if o.strip()]




settings = Settings()

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")



