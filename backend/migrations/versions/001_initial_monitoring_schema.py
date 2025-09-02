"""
Initial monitoring schema migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create initial monitoring schema"""
    
    # Create monitored_entities table
    op.create_table('monitored_entities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('risk_threshold', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create risk_assessments table
    op.create_table('risk_assessments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('risk_score', sa.Numeric(precision=3, scale=2), nullable=False),
        sa.Column('risk_level', sa.String(length=20), nullable=False),
        sa.Column('connections_count', sa.Integer(), nullable=True),
        sa.Column('risk_indicators', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('timestamp', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['monitored_entities.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create alerts table
    op.create_table('alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.TIMESTAMP(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['monitored_entities.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index('idx_monitored_entities_name', 'monitored_entities', ['name'])
    op.create_index('idx_monitored_entities_status', 'monitored_entities', ['status'])
    op.create_index('idx_risk_assessments_entity_id', 'risk_assessments', ['entity_id'])
    op.create_index('idx_risk_assessments_timestamp', 'risk_assessments', ['timestamp'])
    op.create_index('idx_alerts_entity_id', 'alerts', ['entity_id'])
    op.create_index('idx_alerts_timestamp', 'alerts', ['timestamp'])
    op.create_index('idx_alerts_is_active', 'alerts', ['is_active'])


def downgrade() -> None:
    """Drop initial monitoring schema"""
    
    # Drop indexes
    op.drop_index('idx_alerts_is_active', table_name='alerts')
    op.drop_index('idx_alerts_timestamp', table_name='alerts')
    op.drop_index('idx_alerts_entity_id', table_name='alerts')
    op.drop_index('idx_risk_assessments_timestamp', table_name='risk_assessments')
    op.drop_index('idx_risk_assessments_entity_id', table_name='risk_assessments')
    op.drop_index('idx_monitored_entities_status', table_name='monitored_entities')
    op.drop_index('idx_monitored_entities_name', table_name='monitored_entities')
    
    # Drop tables
    op.drop_table('alerts')
    op.drop_table('risk_assessments')
    op.drop_table('monitored_entities')
