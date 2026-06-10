# seed_ndit.py
# Populates your DB with ND IT Solutions: company, values, services, testimonials,
# plus AI models ("Umoja AI") and a travel-assistant chatbot persona.

import os
from typing import List
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from dotenv import load_dotenv
# Load .env if present
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Build engine (no special connect_args by default; driver handles specifics)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


# ====== MODELS ======
class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    website = Column(String(255), nullable=False)
    tagline = Column(String(512))
    description = Column(Text)
    mission = Column(Text)
    vision = Column(Text)
    headquarters = Column(String(512))
    phone = Column(String(64))

    values = relationship("CompanyValue", cascade="all, delete-orphan", back_populates="company")
    services = relationship("Service", cascade="all, delete-orphan", back_populates="company")
    testimonials = relationship("Testimonial", cascade="all, delete-orphan", back_populates="company")
    ai_models = relationship("AIModel", cascade="all, delete-orphan", back_populates="company")
    personas = relationship("ChatbotPersona", cascade="all, delete-orphan", back_populates="company")


class CompanyValue(Base):
    __tablename__ = "company_values"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    description = Column(Text)

    company = relationship("Company", back_populates="values")
    __table_args__ = (UniqueConstraint("company_id", "name", name="uq_value_per_company"),)


class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    summary = Column(Text)
    bullets = Column(Text)  # pipe-separated bullet points

    company = relationship("Company", back_populates="services")
    __table_args__ = (UniqueConstraint("company_id", "name", name="uq_service_per_company"),)


class Testimonial(Base):
    __tablename__ = "testimonials"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    sector = Column(String(128))
    quote = Column(Text, nullable=False)
    author = Column(String(255))
    role = Column(String(255))

    company = relationship("Company", back_populates="testimonials")


class AIModel(Base):
    __tablename__ = "ai_models"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)          # e.g., "Umoja AI"
    slug = Column(String(255), nullable=False)          # e.g., "umoja-ai"
    version = Column(String(64), default="1.0")
    status = Column(String(64), default="active")       # active / beta / deprecated
    short_description = Column(Text)
    long_description = Column(Text)

    company = relationship("Company", back_populates="ai_models")
    __table_args__ = (UniqueConstraint("company_id", "slug", name="uq_model_slug_per_company"),)


class ChatbotPersona(Base):
    __tablename__ = "chatbot_personas"
    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    # Which model this persona points to by default (optional soft link via slug)
    default_model_slug = Column(String(255))
    name = Column(String(255), nullable=False)          # e.g., "NDIT Travel Assistant"
    slug = Column(String(255), nullable=False)          # e.g., "ndit-travel-assistant"
    language = Column(String(32), default="en")
    description = Column(Text)                          # marketing-facing description
    greeting = Column(Text)                             # first message to user
    capabilities = Column(Text)                         # pipe-separated bullets
    limitations = Column(Text)                          # pipe-separated bullets
    safety = Column(Text)                               # pipe-separated bullets
    conversation_starters = Column(Text)                # pipe-separated suggestions
    system_prompt = Column(Text)                        # ready-to-use prompt for your runtime

    company = relationship("Company", back_populates="personas")
    __table_args__ = (UniqueConstraint("company_id", "slug", name="uq_persona_slug_per_company"),)


# ====== SEED DATA ======
def bullets(items: List[str]) -> str:
    return "|".join(items)


def seed_data():
    # --- Company profile (concise and practical for your bot’s “About” block) ---
    company = Company(
        name="ND IT Solutions (NDIT/Nexus)",
        website="https://www.nditsolutions.com/",
        tagline="Technology advisory, managed IT, cloud and security for modern businesses.",
        description=(
            "ND IT Solutions is a technology consulting and managed services partner delivering practical, "
            "cost-effective solutions across cloud, cybersecurity, IT operations and DevOps."
        ),
        mission=(
            "Deliver reliable, customized IT that empowers teams to work securely and efficiently."
        ),
        vision=(
            "Make modern technology accessible, intuitive and growth-enabling for organizations of all sizes."
        ),
        headquarters="1 Meadowlands Plaza, East Rutherford, NJ 07073, USA",
        phone="877-613-8787",
    )

    values = [
        CompanyValue(name="Trust", description="Transparent, secure and dependable delivery."),
        CompanyValue(name="Coherence", description="Aligned decisions and consistent execution."),
        CompanyValue(name="Inspire", description="Enable people and teams to do their best work."),
        CompanyValue(name="Value Creation", description="Solve real problems with measurable outcomes."),
        CompanyValue(name="Diversity & Inclusion", description="Inclusive culture and viewpoints."),
        CompanyValue(name="Continuous Learning", description="Evolve with the tech and the needs."),
    ]

    services = [
        Service(
            name="Technology Advisory",
            summary="Strategic guidance on cloud, security and modern workplace.",
            bullets=bullets(["CIO/CISO/CTO advisory", "Digital transformation", "Security enhancements", "Cloud initiatives"])
        ),
        Service(
            name="Cyber Hygiene",
            summary="Proactive security and incident readiness.",
            bullets=bullets(["GRC", "Incident response", "Posture assessments", "Penetration testing"])
        ),
        Service(
            name="Cloud Strategy",
            summary="Plan and execute secure, scalable cloud adoption.",
            bullets=bullets(["Multi/hybrid cloud", "Migrations", "SaaS enablement", "Scaling & operations"])
        ),
        Service(
            name="Managed Services",
            summary="Help desk, NOC/SOC and voice services.",
            bullets=bullets(["Remote/onsite support", "NOC", "SOC", "Cloud & on-prem voice"])
        ),
        Service(
            name="Migrations",
            summary="Modernize and move apps, email and data.",
            bullets=bullets(["Prem-to-cloud", "Applications", "Email/Data", "VoIP"])
        ),
        Service(
            name="DevOps & Staff Augmentation",
            summary="Augment delivery with vetted engineers.",
            bullets=bullets(["Frontend", "Backend", "Full-stack", "DBA"])
        ),
        Service(
            name="Disaster Recovery",
            summary="BCDR planning, backup and test validation.",
            bullets=bullets(["Planning", "Assessments", "Backups/Recovery", "Audit/Testing"])
        ),
        Service(
            name="AD-HOC Services",
            summary="On-demand projects and site work.",
            bullets=bullets(["Relocation/Decommission", "Warehousing/Assets", "Cabling (Cat6/Fiber)", "Data center moves"])
        ),
        Service(
            name="Incident Response",
            summary="Rapid support for critical events.",
            bullets=bullets(["Ransomware", "Phishing/Malware", "DDoS", "Server failure", "Routing/Misconfig", "Emergency onsite/remote"])
        ),
    ]

    testimonials = [
        Testimonial(sector="Legal", author="Sarah M.", role="Managing Partner",
                    quote="Proactive managed IT and near zero downtime—feels like in-house IT."),
        Testimonial(sector="E-commerce", author="Monica R.", role="Founder",
                    quote="BCDR tested successfully—back online in minutes; real peace of mind."),
    ]

    # --- AI models (adds Umoja AI and a clear description you can surface in UI) ---
    ai_models = [
        AIModel(
            name="Umoja AI",
            slug="umoja-ai",
            version="1.0",
            status="active",
            short_description="Travel assistance from planning to arrival—covering air and ground segments.",
            long_description=(
                "Umoja AI helps travelers plan, book and navigate trips end-to-end. It supports itinerary building, "
                "fare/class comparisons (when connected to your data sources), ground transfers, lodging suggestions, "
                "packing and visa guidance, and real-time trip status checks where integrated. It focuses on clarity, "
                "cost vs. convenience trade-offs, safety guidance, and local norms."
            ),
        ),
    ]

    # --- Chatbot Persona (default self-description for your bot) ---
    persona = ChatbotPersona(
        name="NDIT Travel Assistant",
        slug="ndit-travel-assistant",
        default_model_slug="umoja-ai",
        language="en",
        description=(
            "I’m NDIT Solutions’ AI travel assistant powered by Umoja AI—built to help you plan and manage trips "
            "from first idea to safe arrival, across flights and on-the-ground connections."
        ),
        greeting=(
            "Hi! I’m NDIT’s travel assistant. Tell me your origin, destination, dates and preferences "
            "(budget, carry-on only, seat/meal needs, stopover tolerance), and I’ll draft an itinerary."
        ),
        capabilities=bullets([
            "Itinerary drafting (air + ground)",
            "Connections & layover optimization",
            "Fare/class comparisons (with integrations)",
            "Baggage, visa & docs guidance",
            "Hotel & neighborhood fit suggestions",
            "Local transit and rides options",
            "Change/contingency plans",
            "Status checks if data is available",
        ]),
        limitations=bullets([
            "No purchases—provide links/steps only",
            "May require integrations for live data",
            "Advises—not a legal authority on visas",
            "Availability/prices change rapidly",
        ]),
        safety=bullets([
            "Avoid unsafe routes; suggest safer options",
            "Flag airline/airport strikes or disruptions if known",
            "Encourage official sources for visas & health rules",
            "Never request sensitive payment info in chat",
        ]),
        conversation_starters=bullets([
            "Plan me a 7-day Addis → Nairobi trip in December.",
            "Find a red-eye to JFK with <2h layover, 1 carry-on.",
            "I land at 8pm—best way to get to city center?",
            "I need a kid-friendly neighborhood near museums.",
        ]),
        # System prompt your runtime can slot into the assistant role:
        system_prompt=(
            "You are the NDIT Solutions Travel Assistant, powered by Umoja AI. "
            "Goal: help users plan and manage trips door-to-door (air + ground). "
            "Always ask for missing essentials (origin, destination, dates, pax count, bags, budget, constraints). "
            "If live data/tools are unavailable, provide clear assumptions and offer checklists and links the user can act on. "
            "Present options with trade-offs (price, time, comfort, risk). "
            "Respect safety: avoid risky routes, flag disruptions when known, and recommend official sources for visas/health. "
            "Never collect payment info and never claim to have booked anything. "
            "Output concise, scannable sections with bullets and step-by-step actions."
        ),
    )

    # attach children
    company.values = values
    company.services = services
    company.testimonials = testimonials
    company.ai_models = ai_models
    company.personas = [persona]

    return company


# ====== UPSERT HELPERS ======
def upsert_company_tree(db, company: Company):
    existing = db.query(Company).filter(Company.name == company.name).one_or_none()
    if existing:
        # update base fields
        for field in ["website", "tagline", "description", "mission", "vision", "headquarters", "phone"]:
            setattr(existing, field, getattr(company, field))

        # wipe & re-seed children for determinism
        db.query(CompanyValue).filter_by(company_id=existing.id).delete()
        db.query(Service).filter_by(company_id=existing.id).delete()
        db.query(Testimonial).filter_by(company_id=existing.id).delete()
        db.query(AIModel).filter_by(company_id=existing.id).delete()
        db.query(ChatbotPersona).filter_by(company_id=existing.id).delete()
        db.flush()

        # reattach with correct FK
        for coll in (company.values, company.services, company.testimonials, company.ai_models, company.personas):
            for item in coll:
                item.company_id = existing.id
        db.add_all(company.values + company.services + company.testimonials + company.ai_models + company.personas)
        db.commit()
        return existing.id
    else:
        db.add(company)
        db.flush()
        cid = company.id
        # ensure FKs on children
        for coll in (company.values, company.services, company.testimonials, company.ai_models, company.personas):
            for item in coll:
                item.company_id = cid
        db.add_all(company.values + company.services + company.testimonials + company.ai_models + company.personas)
        db.commit()
        return cid


# ====== MAIN ======
def main():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        company = seed_data()
        cid = upsert_company_tree(db, company)
        print(f"Seeded NDIT content. company_id={cid} "
              f"values={len(company.values)} services={len(company.services)} "
              f"testimonials={len(company.testimonials)} models={len(company.ai_models)} personas={len(company.personas)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
