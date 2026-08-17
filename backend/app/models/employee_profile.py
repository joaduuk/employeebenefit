# backend/app/models/employee_profile.py
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Enum as SAEnum, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    LEFT_EMPLOYER = "left_employer"


class EmployeeProfile(Base):
    """
    One row per employee-at-an-employer. Kept separate from User so a
    person could in theory belong to more than one employer over time
    (job changes) without losing their User/login identity.
    """
    __tablename__ = "employee_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=False)

    # Payroll/HR reference number, if the employer uses one
    employee_reference = Column(String, nullable=True)

    # Overrides Employer.default_employee_monthly_limit when set
    monthly_limit = Column(Numeric(10, 2), nullable=True)

    status = Column(SAEnum(EmployeeStatus), nullable=False, default=EmployeeStatus.ACTIVE)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
