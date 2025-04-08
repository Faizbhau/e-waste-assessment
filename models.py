from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime

# Create a base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Initialize SQLAlchemy with the base class
db = SQLAlchemy(model_class=Base)

class Assessment(db.Model):
    """Model for e-waste component assessment results"""
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    component_type = db.Column(db.String(100), nullable=False)
    quality_score = db.Column(db.Float, nullable=False)
    reusable = db.Column(db.Boolean, nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Assessment {self.id}: {self.component_type}>'
