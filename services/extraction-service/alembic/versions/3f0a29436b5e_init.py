"""init

Revision ID: 3f0a29436b5e
Revises: 
Create Date: 2026-05-02 14:47:08.293972

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3f0a29436b5e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('extractions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('document_id', sa.String(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('provider_used', sa.String(), nullable=False),
        sa.Column('model_used', sa.String(), nullable=False),
        sa.Column('prompt_version', sa.String(), nullable=False),
        sa.Column('processing_time_ms', sa.Integer(), nullable=False),
        sa.Column('token_count', sa.Integer(), nullable=False),
        sa.Column('cost_usd', sa.Float(), nullable=False),
        sa.Column('data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id', 'version', name='uq_document_version')
    )
    op.create_index(op.f('ix_extractions_id'), 'extractions', ['id'], unique=False)
    op.create_index(op.f('ix_extractions_tenant_id'), 'extractions', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_extractions_document_id'), 'extractions', ['document_id'], unique=False)
    op.create_index('ix_extractions_tenant_id_document_id', 'extractions', ['tenant_id', 'document_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_extractions_tenant_id_document_id', table_name='extractions')
    op.drop_index(op.f('ix_extractions_document_id'), table_name='extractions')
    op.drop_index(op.f('ix_extractions_tenant_id'), table_name='extractions')
    op.drop_index(op.f('ix_extractions_id'), table_name='extractions')
    op.drop_table('extractions')
