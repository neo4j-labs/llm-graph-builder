"""
Add subgraph tracking to monitored entities

Revision ID: 002
Revises: 001
Create Date: 2025-09-02 23:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add subgraph tracking fields and table"""
    
    # Add subgraph tracking fields to monitored_entities table
    op.add_column('monitored_entities', sa.Column('last_subgraph_nodes', sa.Integer(), nullable=True))
    op.add_column('monitored_entities', sa.Column('last_subgraph_relationships', sa.Integer(), nullable=True))
    op.add_column('monitored_entities', sa.Column('last_subgraph_timestamp', sa.TIMESTAMP(), nullable=True))
    op.add_column('monitored_entities', sa.Column('subgraph_signature', sa.String(length=255), nullable=True))
    
    # Create subgraph_snapshots table for historical tracking
    op.create_table('subgraph_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('node_count', sa.Integer(), nullable=False),
        sa.Column('relationship_count', sa.Integer(), nullable=False),
        sa.Column('subgraph_signature', sa.String(length=255), nullable=True),
        sa.Column('timestamp', sa.TIMESTAMP(), nullable=True),
        sa.ForeignKeyConstraint(['entity_id'], ['monitored_entities.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better performance
    op.create_index('idx_subgraph_snapshots_entity_id', 'subgraph_snapshots', ['entity_id'])
    op.create_index('idx_subgraph_snapshots_timestamp', 'subgraph_snapshots', ['timestamp'])
    op.create_index('idx_monitored_entities_subgraph_signature', 'monitored_entities', ['subgraph_signature'])


def downgrade() -> None:
    """Remove subgraph tracking fields and table"""
    
    # Drop indexes
    op.drop_index('idx_monitored_entities_subgraph_signature', table_name='monitored_entities')
    op.drop_index('idx_subgraph_snapshots_timestamp', table_name='subgraph_snapshots')
    op.drop_index('idx_subgraph_snapshots_entity_id', table_name='subgraph_snapshots')
    
    # Drop subgraph_snapshots table
    op.drop_table('subgraph_snapshots')
    
    # Remove columns from monitored_entities table
    op.drop_column('monitored_entities', 'subgraph_signature')
    op.drop_column('monitored_entities', 'last_subgraph_timestamp')
    op.drop_column('monitored_entities', 'last_subgraph_relationships')
    op.drop_column('monitored_entities', 'last_subgraph_nodes')
