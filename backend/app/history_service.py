from datetime import UTC, datetime

from .database import connect
from .models import HistoryCreate, HistoryRecord, HistoryResult, HistorySource


async def add_history(
    *,
    host_id: str,
    action: str,
    result: HistoryResult,
    source: HistorySource,
    service_id: str | None = None,
    details: str | None = None,
    user: str = "system",
) -> HistoryRecord:
    timestamp = datetime.now(UTC)
    database = await connect()
    try:
        cursor = await database.execute(
            """
            INSERT INTO maintenance_history
                (timestamp, host_id, service_id, action, user, result, details, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (timestamp.isoformat(), host_id, service_id, action, user, result, details, source),
        )
        await database.commit()
        record_id = cursor.lastrowid
    finally:
        await database.close()
    return HistoryRecord(
        id=int(record_id or 0), timestamp=timestamp, host_id=host_id,
        service_id=service_id, action=action, user=user, result=result,
        details=details, source=source,
    )


async def add_manual_history(payload: HistoryCreate) -> HistoryRecord:
    return await add_history(
        host_id=payload.host_id, service_id=payload.service_id,
        action=payload.action, result=payload.result, details=payload.details,
        source="manual", user="operator",
    )


async def list_history(host_id: str | None = None, service_id: str | None = None) -> list[HistoryRecord]:
    conditions: list[str] = []
    parameters: list[str] = []
    if host_id:
        conditions.append("host_id = ?")
        parameters.append(host_id)
    if service_id:
        conditions.append("service_id = ?")
        parameters.append(service_id)
    where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    database = await connect()
    try:
        cursor = await database.execute(
            f"SELECT * FROM maintenance_history{where} ORDER BY timestamp DESC, id DESC LIMIT 250",
            parameters,
        )
        rows = await cursor.fetchall()
    finally:
        await database.close()
    return [HistoryRecord.model_validate(dict(row)) for row in rows]
