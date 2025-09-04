"""
Update alerts schema to match LLM alert structure

Revision ID: 003
Revises: 002
Create Date: 2025-09-04 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update alerts table to match LLM alert structure"""
    
    # Add new columns to match LLM alert structure (only if they don't exist)
    try:
        op.add_column('alerts', sa.Column('type', sa.String(length=50), nullable=True))
    except:
        pass  # Column already exists
    
    try:
        op.add_column('alerts', sa.Column('score', sa.Numeric(precision=3, scale=2), nullable=True))
    except:
        pass  # Column already exists
    
    try:
        op.add_column('alerts', sa.Column('evidence', sa.Text(), nullable=True))
    except:
        pass  # Column already exists
    
    try:
        op.add_column('alerts', sa.Column('indicator', sa.String(length=255), nullable=True))
    except:
        pass  # Column already exists
    
    try:
        op.add_column('alerts', sa.Column('name', sa.String(length=255), nullable=True))
    except:
        pass  # Column already exists
    
    try:
        op.add_column('alerts', sa.Column('context', sa.Text(), nullable=True))
    except:
        pass  # Column already exists
    
    # Note: New columns will have NULL values for existing records
    # This is fine as the application will handle the new structure


def downgrade() -> None:
    """Revert alerts table changes"""
    
    # Revert column names
    op.alter_column('alerts', 'description', new_column_name='message')
    op.alter_column('alerts', 'type', new_column_name='severity')
    
    # Remove new columns
    op.drop_column('alerts', 'context')
    op.drop_column('alerts', 'name')
    op.drop_column('alerts', 'indicator')
    op.drop_column('alerts', 'evidence')
    op.drop_column('alerts', 'description')
    op.drop_column('alerts', 'score')
    op.drop_column('alerts', 'type')
