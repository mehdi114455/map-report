"""create initial schema

Revision ID: 5e94593b9fe9
Revises: 0001_enable_postgis
Create Date: 2026-05-29 16:54:11.152099

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = '5e94593b9fe9'
down_revision: Union[str, None] = '0001_enable_postgis'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('category_name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('category_id'),
        sa.UniqueConstraint('category_name'),
    )

    op.create_table(
        'duplicate_clusters',
        sa.Column('cluster_id', sa.Integer(), nullable=False),
        sa.Column('representative_report_id', sa.Integer(), nullable=True),
        sa.Column('cluster_status', sa.String(length=32), nullable=False),
        sa.Column('repeated_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(
            ['representative_report_id'], ['reports.report_id'],
            name='fk_cluster_rep_report', use_alter=True,
        ),
        sa.PrimaryKeyConstraint('cluster_id'),
    )

    op.create_table(
        'locations',
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('city', sa.String(length=120), nullable=True),
        sa.Column(
            'geog',
            geoalchemy2.types.Geography(
                geometry_type='POINT', srid=4326,
                from_text='ST_GeogFromText', name='geography',
            ),
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('location_id'),
    )
    # Note: GeoAlchemy2 auto-creates a GIST index on `geog` named idx_locations_geog.

    op.create_table(
        'users',
        sa.Column('user_id', sa.String(length=128), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("role IN ('resident', 'admin')", name='users_role_check'),
        sa.PrimaryKeyConstraint('user_id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'reports',
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=128), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('cluster_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('priority_level', sa.String(length=16), nullable=False),
        sa.Column('current_status', sa.String(length=32), nullable=False),
        sa.Column('image_url', sa.String(length=1024), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "current_status IN ('pending', 'reviewing', 'in_progress', 'resolved', 'rejected')",
            name='reports_status_check',
        ),
        sa.CheckConstraint(
            "priority_level IN ('low', 'normal', 'high', 'critical')",
            name='reports_priority_check',
        ),
        sa.ForeignKeyConstraint(['category_id'], ['categories.category_id']),
        sa.ForeignKeyConstraint(['cluster_id'], ['duplicate_clusters.cluster_id']),
        sa.ForeignKeyConstraint(['location_id'], ['locations.location_id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id']),
        sa.PrimaryKeyConstraint('report_id'),
    )
    op.create_index(op.f('ix_reports_cluster_id'), 'reports', ['cluster_id'], unique=False)
    op.create_index(op.f('ix_reports_user_id'), 'reports', ['user_id'], unique=False)

    op.create_table(
        'status_history',
        sa.Column('status_id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False),
        sa.Column('status_note', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['reports.report_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('status_id'),
    )
    op.create_index(op.f('ix_status_history_report_id'), 'status_history', ['report_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_status_history_report_id'), table_name='status_history')
    op.drop_table('status_history')

    op.drop_index(op.f('ix_reports_user_id'), table_name='reports')
    op.drop_index(op.f('ix_reports_cluster_id'), table_name='reports')
    op.drop_table('reports')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')

    op.drop_table('locations')
    op.drop_table('duplicate_clusters')
    op.drop_table('categories')