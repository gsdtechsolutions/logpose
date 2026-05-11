"""
External API: Schema do banco e query SQL customizada (somente SELECT) via API Key.
Ferramentas de IA para exploração avançada dos dados.
"""
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from database.core.connection import get_db, engine
from database.models.admin import Admin
from api.mcp.auth import get_api_key_user

router = APIRouter(prefix="/external/db", tags=["external"])

# Regex para bloquear qualquer statement que modifique dados
_WRITE_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|MERGE|GRANT|REVOKE|EXEC|EXECUTE|CALL)\b",
    re.IGNORECASE,
)


class QueryRequest(BaseModel):
    sql: str


@router.get("/schema")
def get_schema(
    _user: Admin = Depends(get_api_key_user),
):
    """
    Retorna o schema completo do banco de dados:
    tabelas, colunas, tipos e constraints de chave primária/estrangeira.
    """
    inspector = inspect(engine)
    tables = []
    for table_name in inspector.get_table_names():
        columns = [
            {
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col.get("nullable", True),
                "primary_key": col.get("primary_key", False),
            }
            for col in inspector.get_columns(table_name)
        ]
        foreign_keys = [
            {
                "column": fk["constrained_columns"],
                "references_table": fk["referred_table"],
                "references_column": fk["referred_columns"],
            }
            for fk in inspector.get_foreign_keys(table_name)
        ]
        tables.append({
            "table": table_name,
            "columns": columns,
            "foreign_keys": foreign_keys,
        })

    return {"tables": tables, "total_tables": len(tables)}


@router.post("/query")
def run_query(
    body: QueryRequest,
    db: Session = Depends(get_db),
    _user: Admin = Depends(get_api_key_user),
):
    """
    Executa uma query SQL SELECT customizada e retorna os resultados.
    Apenas SELECT é permitido — qualquer statement de modificação é rejeitado.
    """
    sql = body.sql.strip()

    # Segurança: rejeitar qualquer operação de escrita
    if _WRITE_PATTERN.search(sql):
        raise HTTPException(
            status_code=400,
            detail="Apenas queries SELECT são permitidas. Statements de modificação são bloqueados.",
        )

    if not sql.upper().startswith("SELECT"):
        raise HTTPException(
            status_code=400,
            detail="A query deve começar com SELECT.",
        )

    try:
        result = db.execute(text(sql))
        keys = list(result.keys())
        rows = [dict(zip(keys, row)) for row in result.fetchall()]
        return {"columns": keys, "rows": rows, "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro na query: {str(e)}")
