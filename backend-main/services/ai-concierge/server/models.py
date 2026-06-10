from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

try:
    from server.db import Base
except ImportError:
    # Support running from within the ai/ folder (module path: server.models)
    from server.db import Base  # type: ignore


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(128), index=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    title = Column(Text, nullable=True)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_ai_conversations_user_updated", "user_id", "updated_at"),
    )


class Message(Base):
    __tablename__ = "ai_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(64), ForeignKey("ai_conversations.id"), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # 'human' or 'ai'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("ix_ai_messages_conv_created", "conversation_id", "created_at"),
    )
