from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
try:
    from server.models import Conversation, Message
except ImportError:
    # Support running from within the ai/ folder (module path: server.repo)
    from server.models import Conversation, Message  # type: ignore


def create_conversation(db: Session, conv_id: str, user_id: str) -> Conversation:
    conv = Conversation(id=conv_id, user_id=user_id)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def get_conversation(db: Session, conv_id: str) -> Optional[Conversation]:
    return db.get(Conversation, conv_id)


def list_conversations_for_user(db: Session, user_id: str) -> List[Conversation]:
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(desc(Conversation.updated_at))
    )
    return list(db.scalars(stmt))


def list_messages(db: Session, conv_id: str) -> List[Message]:
    stmt = (
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
    )
    return list(db.scalars(stmt))


def append_message(db: Session, conv_id: str, role: str, content: str) -> Message:
    msg = Message(conversation_id=conv_id, role=role, content=content)
    db.add(msg)
    # also bump conversation updated_at
    conv = db.get(Conversation, conv_id)
    if conv:
        from server.models import now_utc
        conv.updated_at = now_utc()
    db.commit()
    db.refresh(msg)
    return msg


def last_message_text(db: Session, conv_id: str) -> str:
    stmt = (
        select(Message.content)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    row = db.execute(stmt).first()
    return row[0] if row else ""
