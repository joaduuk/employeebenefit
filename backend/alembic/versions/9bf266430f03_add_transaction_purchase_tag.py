"""add transaction purchase_tag

Revision ID: 9bf266430f03
Revises: 311b9acc4e52
Create Date: 2026-08-25 07:12:13.839106

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '9bf266430f03'
down_revision = '311b9acc4e52'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL needs the enum TYPE to exist before any column can use
    # it — autogenerate doesn't always emit this for a plain add_column
    # against an existing table, so it's created explicitly here.
    purchase_tag_enum = postgresql.ENUM(
        'FOOD_DRINKS', 'DAILY_ESSENTIALS', 'MIXED',
        name='transactionpurchasetag',
    )
    purchase_tag_enum.create(op.get_bind(), checkfirst=True)

    op.add_column('transactions', sa.Column('purchase_tag', purchase_tag_enum, nullable=True))


def downgrade() -> None:
    op.drop_column('transactions', 'purchase_tag')

    purchase_tag_enum = postgresql.ENUM(
        'FOOD_DRINKS', 'DAILY_ESSENTIALS', 'MIXED',
        name='transactionpurchasetag',
    )
    purchase_tag_enum.drop(op.get_bind(), checkfirst=True)