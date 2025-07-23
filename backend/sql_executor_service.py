# backend/sql_executor_service.py
import os
import re
import sqlite3
import time
from contextlib import contextmanager
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from flask import current_app

class SQLExecutorService:
    """Enhanced SQL Executor Service for Admin Panel with safety features"""
    
    def __init__(self, db_url: str = None):
        self.db_url = db_url or os.environ.get('DATABASE_URL', 'sqlite:///blitz.db')
        self.db_path = self._extract_db_path(self.db_url)
        
        # SQL command categories for security
        self.read_only_commands = {
            'SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'PRAGMA'
        }
        
        self.write_commands = {
            'INSERT', 'UPDATE', 'DELETE', 'REPLACE'
        }
        
        self.ddl_commands = {
            'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME'
        }
        
        self.dangerous_commands = {
            'DROP', 'TRUNCATE', 'DELETE', 'ALTER'
        }
        
        # SQL injection patterns to block
        self.injection_patterns = [
            r';\s*DROP\s+',
            r';\s*DELETE\s+FROM\s+',
            r';\s*UPDATE\s+.*\s+SET\s+',
            r'--\s*$',
            r'/\*.*\*/',
            r'UNION\s+SELECT',
            r'OR\s+1\s*=\s*1',
            r'AND\s+1\s*=\s*1'
        ]
    
    def _extract_db_path(self, db_url: str) -> str:
        """Extract database file path from URL"""
        if db_url.startswith('sqlite:///'):
            return db_url.replace('sqlite:///', '')
        elif db_url.startswith('sqlite://'):
            return db_url.replace('sqlite://', '')
        else:
            return 'blitz.db'  # fallback
    
    @contextmanager
    def get_connection(self):
        """Get database connection with proper cleanup"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path, timeout=30)
            conn.row_factory = sqlite3.Row  # Enable column access by name
            # Enable foreign keys for SQLite
            conn.execute("PRAGMA foreign_keys = ON")
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            raise e
        finally:
            if conn:
                conn.close()
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analyze SQL query for safety and categorization"""
        query_clean = query.strip().upper()
        
        # Remove comments and normalize whitespace
        query_clean = re.sub(r'--.*$', '', query_clean, flags=re.MULTILINE)
        query_clean = re.sub(r'/\*.*?\*/', '', query_clean, flags=re.DOTALL)
        query_clean = ' '.join(query_clean.split())
        
        # Get first command
        first_word = query_clean.split()[0] if query_clean.split() else ''
        
        analysis = {
            'command': first_word,
            'is_read_only': first_word in self.read_only_commands,
            'is_write': first_word in self.write_commands,
            'is_ddl': first_word in self.ddl_commands,
            'is_dangerous': first_word in self.dangerous_commands,
            'is_multi_statement': ';' in query.rstrip(';'),
            'estimated_risk': 'LOW',
            'warnings': []
        }
        
        # Check for dangerous patterns
        if analysis['is_dangerous']:
            analysis['estimated_risk'] = 'HIGH'
            analysis['warnings'].append(f"Dangerous command: {first_word}")
        
        if analysis['is_ddl']:
            analysis['estimated_risk'] = 'MEDIUM' if analysis['estimated_risk'] == 'LOW' else 'HIGH'
            analysis['warnings'].append("Schema modification command")
        
        if analysis['is_multi_statement']:
            analysis['estimated_risk'] = 'HIGH'
            analysis['warnings'].append("Multiple statements detected")
        
        # Check for SQL injection patterns
        for pattern in self.injection_patterns:
            if re.search(pattern, query_clean, re.IGNORECASE):
                analysis['estimated_risk'] = 'CRITICAL'
                analysis['warnings'].append("Potential SQL injection pattern detected")
                break
        
        return analysis
    
    def execute_query(self, query: str, page: int = 1, per_page: int = 100, 
                     allow_dangerous: bool = False) -> Dict[str, Any]:
        """Execute SQL query with safety checks and pagination"""
        start_time = time.time()
        
        if not query or not query.strip():
            return {
                'success': False,
                'error': 'Empty query provided',
                'execution_time': 0
            }
        
        # Analyze query for safety
        analysis = self.analyze_query(query)
        
        # Safety checks
        if analysis['estimated_risk'] == 'CRITICAL':
            return {
                'success': False,
                'error': 'Query blocked due to security concerns',
                'warnings': analysis['warnings'],
                'execution_time': 0
            }
        
        if analysis['is_dangerous'] and not allow_dangerous:
            return {
                'success': False,
                'error': 'Dangerous query blocked. Admin approval required.',
                'warnings': analysis['warnings'],
                'analysis': analysis,
                'execution_time': 0
            }
        
        if analysis['is_multi_statement']:
            return {
                'success': False,
                'error': 'Multiple statements not allowed for security',
                'warnings': analysis['warnings'],
                'execution_time': 0
            }
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if analysis['is_read_only']:
                    return self._execute_read_query(cursor, query, page, per_page, start_time, analysis)
                elif analysis['is_write'] or analysis['is_ddl']:
                    return self._execute_write_query(cursor, conn, query, start_time, analysis)
                else:
                    return {
                        'success': False,
                        'error': f'Unsupported command: {analysis["command"]}',
                        'execution_time': round(time.time() - start_time, 3)
                    }
                    
        except sqlite3.Error as e:
            return {
                'success': False,
                'error': f'Database error: {str(e)}',
                'execution_time': round(time.time() - start_time, 3)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Execution error: {str(e)}',
                'execution_time': round(time.time() - start_time, 3)
            }
    
    def _execute_read_query(self, cursor, query: str, page: int, per_page: int, 
                           start_time: float, analysis: Dict) -> Dict[str, Any]:
        """Execute read-only query with pagination"""
        
        # For SELECT queries, implement pagination
        if analysis['command'] == 'SELECT':
            # First get total count
            try:
                count_query = f"SELECT COUNT(*) FROM ({query}) AS count_subquery"
                cursor.execute(count_query)
                total_count = cursor.fetchone()[0]
            except:
                # If count query fails, proceed without total count
                total_count = None
            
            # Add pagination to original query
            offset = (page - 1) * per_page
            paginated_query = f"{query} LIMIT {per_page} OFFSET {offset}"
            cursor.execute(paginated_query)
        else:
            # For other read queries (PRAGMA, EXPLAIN, etc.)
            cursor.execute(query)
            total_count = cursor.rowcount if cursor.rowcount >= 0 else None
        
        # Get column names
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        
        # Fetch results
        rows = cursor.fetchall()
        
        # Convert rows to list of lists for JSON serialization
        row_data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                # Handle special data types
                if isinstance(value, datetime):
                    value = value.isoformat()
                elif isinstance(value, (bytes, bytearray)):
                    value = f"<binary data: {len(value)} bytes>"
                row_dict[col] = value
            row_data.append(row_dict)
        
        execution_time = round(time.time() - start_time, 3)
        
        result = {
            'success': True,
            'columns': columns,
            'rows': row_data,
            'row_count': len(rows),
            'page': page,
            'per_page': per_page,
            'execution_time': execution_time,
            'query_type': 'READ',
            'command': analysis['command']
        }
        
        if total_count is not None:
            result['total_count'] = total_count
            result['total_pages'] = (total_count + per_page - 1) // per_page
            result['has_more'] = page * per_page < total_count
        
        if analysis['warnings']:
            result['warnings'] = analysis['warnings']
        
        return result
    
    def _execute_write_query(self, cursor, conn, query: str, start_time: float, 
                            analysis: Dict) -> Dict[str, Any]:
        """Execute write/DDL query with transaction support"""
        
        try:
            cursor.execute(query)
            
            # Commit the transaction
            conn.commit()
            
            execution_time = round(time.time() - start_time, 3)
            
            result = {
                'success': True,
                'rows_affected': cursor.rowcount if cursor.rowcount >= 0 else 0,
                'execution_time': execution_time,
                'query_type': 'WRITE' if analysis['is_write'] else 'DDL',
                'command': analysis['command'],
                'message': f'Query executed successfully. {cursor.rowcount if cursor.rowcount >= 0 else 0} rows affected.'
            }
            
            if analysis['warnings']:
                result['warnings'] = analysis['warnings']
            
            return result
            
        except Exception as e:
            # Rollback on error
            conn.rollback()
            raise e
    
    def get_table_info(self, table_name: str = None) -> Dict[str, Any]:
        """Get information about database tables"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if table_name:
                    # Get specific table info
                    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
                    table_sql = cursor.fetchone()
                    
                    if not table_sql:
                        return {
                            'success': False,
                            'error': f'Table "{table_name}" not found'
                        }
                    
                    # Get column info
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    columns = cursor.fetchall()
                    
                    # Get indexes
                    cursor.execute(f"PRAGMA index_list({table_name})")
                    indexes = cursor.fetchall()
                    
                    return {
                        'success': True,
                        'table_name': table_name,
                        'create_sql': table_sql[0],
                        'columns': [dict(col) for col in columns],
                        'indexes': [dict(idx) for idx in indexes]
                    }
                else:
                    # Get all tables
                    cursor.execute("""
                        SELECT name, type, sql 
                        FROM sqlite_master 
                        WHERE type IN ('table', 'view') 
                        ORDER BY type, name
                    """)
                    objects = cursor.fetchall()
                    
                    tables = []
                    views = []
                    
                    for obj in objects:
                        obj_dict = dict(obj)
                        if obj['type'] == 'table':
                            # Get row count for tables
                            try:
                                cursor.execute(f"SELECT COUNT(*) FROM {obj['name']}")
                                obj_dict['row_count'] = cursor.fetchone()[0]
                            except:
                                obj_dict['row_count'] = 0
                            tables.append(obj_dict)
                        else:
                            views.append(obj_dict)
                    
                    return {
                        'success': True,
                        'tables': tables,
                        'views': views,
                        'total_tables': len(tables),
                        'total_views': len(views)
                    }
                    
        except Exception as e:
            return {
                'success': False,
                'error': f'Error getting table info: {str(e)}'
            }
    
    def get_query_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent query history (this would need to be implemented with logging)"""
        # This is a placeholder - in a real implementation, you'd store query history
        return []
    
    def validate_query_syntax(self, query: str) -> Dict[str, Any]:
        """Validate SQL query syntax without executing it"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                # Use EXPLAIN to validate syntax without execution
                cursor.execute(f"EXPLAIN {query}")
                
                return {
                    'success': True,
                    'valid': True,
                    'message': 'Query syntax is valid'
                }
        except sqlite3.Error as e:
            return {
                'success': True,
                'valid': False,
                'error': str(e),
                'message': 'Query syntax is invalid'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Validation error: {str(e)}'
            }
    
    def export_query_results(self, query: str, format: str = 'csv') -> Dict[str, Any]:
        """Export query results to file (CSV, JSON, etc.)"""
        if format not in ['csv', 'json']:
            return {
                'success': False,
                'error': 'Unsupported export format. Use csv or json.'
            }
        
        # Execute query without pagination to get all results
        result = self.execute_query(query, page=1, per_page=100000)
        
        if not result['success']:
            return result
        
        try:
            import tempfile
            import csv
            import json
            from datetime import datetime
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if format == 'csv':
                temp_file = tempfile.NamedTemporaryFile(
                    mode='w', 
                    suffix=f'_query_export_{timestamp}.csv',
                    delete=False
                )
                
                if result['rows']:
                    writer = csv.DictWriter(temp_file, fieldnames=result['columns'])
                    writer.writeheader()
                    writer.writerows(result['rows'])
                
                temp_file.close()
                
            elif format == 'json':
                temp_file = tempfile.NamedTemporaryFile(
                    mode='w',
                    suffix=f'_query_export_{timestamp}.json',
                    delete=False
                )
                
                export_data = {
                    'query': query,
                    'exported_at': datetime.now().isoformat(),
                    'columns': result['columns'],
                    'rows': result['rows'],
                    'row_count': result['row_count']
                }
                
                json.dump(export_data, temp_file, indent=2, default=str)
                temp_file.close()
            
            return {
                'success': True,
                'file_path': temp_file.name,
                'format': format,
                'row_count': result['row_count']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Export failed: {str(e)}'
            }