# backend/auth.py
from functools import wraps
from flask import jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            user_id = int(get_jwt_identity())
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if not user.is_active:
                return jsonify({'error': 'User account is deactivated'}), 403
            
            if user.role != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            
            return f(*args, **kwargs)
            
        except Exception as e:
            current_app.logger.error(f"Admin auth error: {e}")
            return jsonify({'error': 'Authentication failed'}), 500
    
    return decorated_function

def business_user_required(f):
    """Decorator to require business user or admin role"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            user_id = int(get_jwt_identity())
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if not user.is_active:
                return jsonify({'error': 'User account is deactivated'}), 403
            
            if user.role not in ['business_user', 'admin']:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
            
        except Exception as e:
            current_app.logger.error(f"Business user auth error: {e}")
            return jsonify({'error': 'Authentication failed'}), 500
    
    return decorated_function

def get_current_user():
    """Get current authenticated user"""
    try:
        user_id = int(get_jwt_identity())
        if user_id:
            return User.query.get(user_id)
        return None
    except Exception:
        return None

def check_cost_limit(user_id: int, additional_cost: float = 0.0) -> bool:
    """Check if user is within cost limit"""
    try:
        user = User.query.get(user_id)
        if not user:
            return False
        
        # Get current cost
        from models import Cost, db
        current_cost = db.session.query(
            db.func.sum(Cost.amount)
        ).filter_by(user_id=user_id).scalar() or 0.0
        
        total_cost = current_cost + additional_cost
        
        return total_cost <= user.cost_limit
        
    except Exception as e:
        current_app.logger.error(f"Cost limit check error: {e}")
        return False

def cost_limit_required(f):
    """Decorator to check cost limits before execution"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = int(get_jwt_identity())
            if not check_cost_limit(user_id):
                return jsonify({
                    'error': 'Cost limit exceeded',
                    'message': 'Your usage has exceeded the configured cost limit. Please contact an administrator.'
                }), 429
            
            return f(*args, **kwargs)
            
        except Exception as e:
            current_app.logger.error(f"Cost limit check error: {e}")
            return jsonify({'error': 'Cost limit check failed'}), 500
    
    return decorated_function