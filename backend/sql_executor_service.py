# backend/sql_executor_service.py
import os
import re
import sqlite3
import time
from contextlib import contextmanager
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from flask import current_app
from pathlib import Path

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
            r'UNION\s+.*SELECT',
            r'EXEC\s*\(',
            r'xp_\w+',
            r'sp_\w+'
        ]
        
    def _extract_db_path(self, db_url: str) -> str:
        """Extract database file path from URL with Flask instance folder support"""
        if db_url.startswith('sqlite:///'):
            relative_path = db_url.replace('sqlite:///', '')
            
            # Check if it's an absolute path
            if os.path.isabs(relative_path):
                return relative_path
            
            # For relative paths, check multiple locations where Flask might put the DB
            possible_paths = [
                # Flask instance folder (most common)
                os.path.join(os.getcwd(), 'instance', relative_path),
                os.path.join(os.getcwd(), 'backend', 'instance', relative_path),
            ]
            
            # Find the existing database file
            for path in possible_paths:
                if os.path.exists(path):
                    print(f"✅ Found database at: {path}")
                    return path
            
            # If no existing file found, use the first location (instance folder)
            # This follows Flask's default behavior
            instance_path = possible_paths[0]
            
            # Create instance directory if it doesn't exist
            instance_dir = os.path.dirname(instance_path)
            if instance_dir and not os.path.exists(instance_dir):
                os.makedirs(instance_dir, exist_ok=True)
                print(f"📁 Created instance directory: {instance_dir}")
            
            print(f"📍 Using database path: {instance_path}")
            return instance_path
            
        elif db_url.startswith('sqlite://'):
            return db_url.replace('sqlite://', '')
        else:
            return 'instance/blitz.db'  # fallback with instance folder
    
    @contextmanager
    def get_connection(self):
        """Get database connection with proper cleanup"""
        conn = None
        try:
            # Ensure database file exists
            if not os.path.exists(self.db_path):
                raise FileNotFoundError(f"Database file not found at: {self.db_path}")
            
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
    
    def validate_query(self, query: str) -> Tuple[bool, str, str]:
        """
        Validate SQL query for security and safety
        Returns: (is_valid, command_type, error_message)
        """
        if not query or not query.strip():
            return False, "", "Empty query"
        
        # Clean the query
        clean_query = query.strip().upper()
        
        # Check for dangerous patterns
        for pattern in self.injection_patterns:
            if re.search(pattern, clean_query, re.IGNORECASE):
                return False, "", f"Potentially dangerous pattern detected: {pattern}"
        
        # Determine command type
        first_word = clean_query.split()[0] if clean_query.split() else ""
        
        if first_word in self.read_only_commands:
            return True, "READ", ""
        elif first_word in self.write_commands:
            return True, "WRITE", ""
        elif first_word in self.ddl_commands:
            if first_word in self.dangerous_commands:
                return False, "DANGEROUS", f"Dangerous command: {first_word}"
            return True, "DDL", ""
        else:
            return False, "UNKNOWN", f"Unknown or unsupported command: {first_word}"
    


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
        
        # Check if database file exists
        if not os.path.exists(self.db_path):
            return {
                'success': False,
                'error': f'Database file not found at: {self.db_path}',
                'database_path': self.db_path,
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
            error_msg = str(e)
            execution_time = round(time.time() - start_time, 3)
            
            # Enhanced error handling for column-related errors
            if 'no such column' in error_msg.lower():
                # Extract table name from query for better error reporting
                table_suggestions = self._get_table_suggestions_for_error(query, error_msg)
                return {
                    'success': False,
                    'error': f'Database error: {error_msg}',
                    'database_path': self.db_path,
                    'execution_time': execution_time,
                    'suggestions': table_suggestions,
                    'help': 'Use /api/admin/tables to list available tables and columns'
                }
            elif 'no such table' in error_msg.lower():
                available_tables = self._get_available_tables()
                return {
                    'success': False,
                    'error': f'Database error: {error_msg}',
                    'database_path': self.db_path,
                    'execution_time': execution_time,
                    'available_tables': available_tables,
                    'help': 'Use /api/admin/tables to list available tables'
                }
            else:
                return {
                    'success': False,
                    'error': f'Database error: {error_msg}',
                    'database_path': self.db_path,
                    'execution_time': execution_time
                }
        except Exception as e:
            return {
                'success': False,
                'error': f'Execution error: {str(e)}',
                'database_path': self.db_path,
                'execution_time': round(time.time() - start_time, 3)
            }

    def _get_table_suggestions_for_error(self, query: str, error_msg: str) -> Dict[str, Any]:
        """Get table and column suggestions when SQL error occurs"""
        try:
            # Extract table name from query (simple regex approach)
            import re
            table_matches = re.findall(r'FROM\s+(\w+)', query.upper())
            
            suggestions = {}
            
            if table_matches:
                table_name = table_matches[0].lower()
                table_info = self.get_table_info(table_name)
                
                if table_info.get('success'):
                    columns = [col['name'] for col in table_info.get('columns', [])]
                    suggestions[table_name] = {
                        'available_columns': columns,
                        'total_columns': len(columns)
                    }
            
            # Also get list of all tables
            all_tables = self._get_available_tables()
            suggestions['all_tables'] = all_tables
            
            return suggestions
            
        except Exception:
            return {'error': 'Could not generate suggestions'}

    def _get_available_tables(self) -> List[str]:
        """Get list of available tables"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                tables = [row[0] for row in cursor.fetchall()]
                return tables
        except Exception:
            return []

    def _execute_read_query(self, cursor, query: str, page: int, per_page: int, 
                        start_time: float, analysis: Dict) -> Dict[str, Any]:
        """Execute read-only query with pagination"""
        
        # For SELECT queries, implement pagination
        if analysis['command'] == 'SELECT':
            # First get total count
            try:
                # Wrap the original query to get count
                count_query = f"SELECT COUNT(*) FROM ({query}) AS count_subquery"
                cursor.execute(count_query)
                total_count = cursor.fetchone()[0]
            except Exception:
                # If count query fails, proceed without total count
                total_count = None
            
            # Add pagination to original query - ensure proper SQL syntax
            offset = (page - 1) * per_page
            if query.strip().rstrip(';').upper().find('LIMIT') == -1:
                paginated_query = f"{query.rstrip(';')} LIMIT {per_page} OFFSET {offset}"
            else:
                # Query already has LIMIT, replace it
                import re
                paginated_query = re.sub(r'\s+LIMIT\s+\d+(\s+OFFSET\s+\d+)?', 
                                    f' LIMIT {per_page} OFFSET {offset}', 
                                    query.rstrip(';'), flags=re.IGNORECASE)
            
            cursor.execute(paginated_query)
        else:
            # For other read queries (PRAGMA, EXPLAIN, etc.)
            cursor.execute(query)
            total_count = cursor.rowcount if cursor.rowcount >= 0 else None
        
        # Get column names
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        
        # Fetch results
        rows = cursor.fetchall()
        
        # Convert rows to list of dicts for JSON serialization
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
                elif isinstance(value, float):
                    value = round(value, 3)  # Round floats to 3 decimal places
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
            'command': analysis['command'],
            'database_path': self.db_path
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
                'database_path': self.db_path,
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
                        'total_views': len(views),
                        'database_path': self.db_path
                    }
                    
        except Exception as e:
            return {
                'success': False,
                'error': f'Error getting table info: {str(e)}',
                'database_path': self.db_path
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


    def get_query_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent query history (if logging is implemented)"""
        # This would require a query_history table to be implemented
        # For now, return empty list
        return []
    
    def save_query_history(self, query: str, success: bool, execution_time: float, 
                         user_id: int = None) -> None:
        """Save query to history (if logging is implemented)"""
        # This would save to a query_history table
        # Implementation depends on whether you want to add this table
        pass
    
    def get_database_info(self) -> Dict[str, Any]:
        """Get general database information"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Get database file size
                db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
                
                # Get table count
                cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
                table_count = cursor.fetchone()[0]
                
                # Get total records across all tables
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                
                total_records = 0
                for table in tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM `{table[0]}`")
                        total_records += cursor.fetchone()[0]
                    except:
                        pass
                
                # Get SQLite version
                cursor.execute("SELECT sqlite_version()")
                sqlite_version = cursor.fetchone()[0]
                
                return {
                    'database_path': self.db_path,
                    'database_size_bytes': db_size,
                    'database_size_mb': round(db_size / (1024 * 1024), 2),
                    'table_count': table_count,
                    'total_records': total_records,
                    'sqlite_version': sqlite_version,
                    'last_modified': datetime.fromtimestamp(os.path.getmtime(self.db_path)).isoformat() if os.path.exists(self.db_path) else None
                }
        
        except Exception as e:
            raise Exception(f"Failed to get database info: {str(e)}")


    def execute_query(self, query: str, params: tuple = None, page: int = 1, 
                     page_size: int = 50, allow_dangerous: bool = False) -> Dict[str, Any]:
        """
        Execute SQL query with pagination and safety checks
        """
        start_time = time.time()
        
        # Validate query
        is_valid, command_type, error_msg = self.validate_query(query)
        if not is_valid:
            if command_type == "DANGEROUS" and not allow_dangerous:
                return {
                    'success': False,
                    'error': f"Dangerous operation blocked: {error_msg}",
                    'query_type': command_type,
                    'execution_time': time.time() - start_time
                }
            elif not is_valid:
                return {
                    'success': False,
                    'error': error_msg,
                    'query_type': command_type,
                    'execution_time': time.time() - start_time
                }
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if command_type == "READ":
                    # For SELECT queries, add pagination
                    if query.upper().strip().startswith('SELECT'):
                        # Count total rows
                        count_query = f"SELECT COUNT(*) FROM ({query}) AS count_subquery"
                        cursor.execute(count_query, params or ())
                        total_rows = cursor.fetchone()[0]
                        
                        # Add pagination to original query
                        offset = (page - 1) * page_size
                        paginated_query = f"{query} LIMIT {page_size} OFFSET {offset}"
                        cursor.execute(paginated_query, params or ())
                    else:
                        # Non-SELECT read operations (PRAGMA, etc.)
                        cursor.execute(query, params or ())
                        total_rows = cursor.rowcount
                    
                    # Fetch results
                    rows = cursor.fetchall()
                    columns = [description[0] for description in cursor.description] if cursor.description else []
                    
                    # Convert rows to dictionaries
                    data = []
                    for row in rows:
                        row_dict = {}
                        for i, col in enumerate(columns):
                            row_dict[col] = row[i]
                        data.append(row_dict)
                    
                    return {
                        'success': True,
                        'data': data,
                        'columns': columns,
                        'total_rows': total_rows if query.upper().strip().startswith('SELECT') else len(data),
                        'page': page,
                        'page_size': page_size,
                        'total_pages': (total_rows + page_size - 1) // page_size if query.upper().strip().startswith('SELECT') else 1,
                        'query_type': command_type,
                        'execution_time': round(time.time() - start_time, 3)
                    }
                
                else:
                    # For write operations
                    cursor.execute(query, params or ())
                    conn.commit()
                    
                    return {
                        'success': True,
                        'message': f"Query executed successfully. Rows affected: {cursor.rowcount}",
                        'rows_affected': cursor.rowcount,
                        'query_type': command_type,
                        'execution_time': round(time.time() - start_time, 3)
                    }
        
        except sqlite3.Error as e:
            return {
                'success': False,
                'error': f"Database error: {str(e)}",
                'query_type': command_type,
                'execution_time': round(time.time() - start_time, 3)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Execution error: {str(e)}",
                'query_type': command_type,
                'execution_time': round(time.time() - start_time, 3)
            }
    
    def get_tables(self) -> List[Dict[str, Any]]:
        """Get list of all tables in the database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT name, type, sql 
                    FROM sqlite_master 
                    WHERE type='table' 
                    ORDER BY name
                """)
                
                tables = []
                for row in cursor.fetchall():
                    # Get row count for each table
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM `{row[0]}`")
                        row_count = cursor.fetchone()[0]
                    except:
                        row_count = 0
                    
                    tables.append({
                        'name': row[0],
                        'type': row[1],
                        'sql': row[2],
                        'row_count': row_count
                    })
                
                return tables
        
        except Exception as e:
            raise Exception(f"Failed to get tables: {str(e)}")
    
    def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """Get schema information for a specific table"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"PRAGMA table_info(`{table_name}`)")
                
                schema = []
                for row in cursor.fetchall():
                    schema.append({
                        'column_id': row[0],
                        'name': row[1],
                        'type': row[2],
                        'not_null': bool(row[3]),
                        'default_value': row[4],
                        'primary_key': bool(row[5])
                    })
                
                return schema
        
        except Exception as e:
            raise Exception(f"Failed to get table schema: {str(e)}")
    
    def get_table_data(self, table_name: str, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """Get paginated data from a specific table"""
        query = f"SELECT * FROM `{table_name}`"
        return self.execute_query(query, page=page, page_size=page_size)
    
    def export_results(self, data: List[Dict], format_type: str = 'csv') -> str:
        """Export query results to file"""
        if not data:
            raise ValueError("No data to export")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format_type.lower() == 'csv':
            import csv
            import io
            
            output = io.StringIO()
            if data:
                writer = csv.DictWriter(output, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            
            filename = f"query_results_{timestamp}.csv"
            filepath = os.path.join('temp', filename)
            
            # Ensure temp directory exists
            os.makedirs('temp', exist_ok=True)
            
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                f.write(output.getvalue())
            
            return filepath
        
        elif format_type.lower() == 'json':
            import json
            
            filename = f"query_results_{timestamp}.json"
            filepath = os.path.join('temp', filename)
            
            # Ensure temp directory exists
            os.makedirs('temp', exist_ok=True)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            
            return filepath
        
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
