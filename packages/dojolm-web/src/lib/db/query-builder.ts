/**
 * Fluent query builder for complex database queries.
 *
 * All values are bound as parameters — never interpolated into SQL.
 * Supports WHERE, ORDER BY, LIMIT, OFFSET, and JSON field extraction.
 */

export class QueryBuilder {
  private _table: string;
  private _select: string = '*';
  private _conditions: string[] = [];
  private _params: unknown[] = [];
  private _orderBy: string | null = null;
  private _orderDir: 'ASC' | 'DESC' = 'ASC';
  private _limit: number | null = null;
  private _offset: number | null = null;
  private _joins: string[] = [];
  private _groupBy: string | null = null;

  /** Validate SQL identifier to prevent injection via structural elements */
  private static validateIdentifier(name: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_.*()\s,'"]*$/.test(name)) {
      throw new Error(`Invalid SQL identifier: ${name}`);
    }
    return name;
  }

  constructor(table: string) {
    this._table = QueryBuilder.validateIdentifier(table);
  }

  static from(table: string): QueryBuilder {
    return new QueryBuilder(table);
  }

  select(columns: string): QueryBuilder {
    this._select = columns;
    return this;
  }

  where(column: string, value: unknown): QueryBuilder {
    if (value === null) {
      this._conditions.push(`${column} IS NULL`);
    } else {
      this._conditions.push(`${column} = ?`);
      this._params.push(value);
    }
    return this;
  }

  whereIn(column: string, values: unknown[]): QueryBuilder {
    if (values.length === 0) {
      this._conditions.push('1 = 0'); // Always false
      return this;
    }
    const placeholders = values.map(() => '?').join(', ');
    this._conditions.push(`${column} IN (${placeholders})`);
    this._params.push(...values);
    return this;
  }

  whereGte(column: string, value: unknown): QueryBuilder {
    this._conditions.push(`${column} >= ?`);
    this._params.push(value);
    return this;
  }

  whereLte(column: string, value: unknown): QueryBuilder {
    this._conditions.push(`${column} <= ?`);
    this._params.push(value);
    return this;
  }

  whereLike(column: string, pattern: string): QueryBuilder {
    this._conditions.push(`${column} LIKE ?`);
    this._params.push(pattern);
    return this;
  }

  whereNotNull(column: string): QueryBuilder {
    this._conditions.push(`${column} IS NOT NULL`);
    return this;
  }

  /**
   * Filter on a JSON field using SQLite json_extract().
   */
  whereJson(column: string, jsonPath: string, value: unknown): QueryBuilder {
    this._conditions.push(`json_extract(${column}, ?) = ?`);
    this._params.push(jsonPath, value);
    return this;
  }

  join(table: string, on: string): QueryBuilder {
    this._joins.push(`JOIN ${table} ON ${on}`);
    return this;
  }

  leftJoin(table: string, on: string): QueryBuilder {
    this._joins.push(`LEFT JOIN ${table} ON ${on}`);
    return this;
  }

  groupBy(column: string): QueryBuilder {
    this._groupBy = column;
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this._orderBy = column;
    this._orderDir = direction;
    return this;
  }

  limit(n: number): QueryBuilder {
    this._limit = n;
    return this;
  }

  offset(n: number): QueryBuilder {
    this._offset = n;
    return this;
  }

  /**
   * Build the SQL query and parameter array.
   */
  build(): { sql: string; params: unknown[] } {
    const parts: string[] = [`SELECT ${this._select} FROM ${this._table}`];

    if (this._joins.length > 0) {
      parts.push(this._joins.join(' '));
    }

    if (this._conditions.length > 0) {
      parts.push(`WHERE ${this._conditions.join(' AND ')}`);
    }

    if (this._groupBy) {
      parts.push(`GROUP BY ${this._groupBy}`);
    }

    if (this._orderBy) {
      parts.push(`ORDER BY ${this._orderBy} ${this._orderDir}`);
    }

    if (this._limit !== null) {
      parts.push('LIMIT ?');
      this._params.push(this._limit);
    }

    if (this._offset !== null) {
      parts.push('OFFSET ?');
      this._params.push(this._offset);
    }

    return { sql: parts.join(' '), params: [...this._params] };
  }

  /**
   * Build a COUNT version of this query.
   */
  buildCount(): { sql: string; params: unknown[] } {
    const parts: string[] = [`SELECT COUNT(*) as total FROM ${this._table}`];

    if (this._joins.length > 0) {
      parts.push(this._joins.join(' '));
    }

    if (this._conditions.length > 0) {
      parts.push(`WHERE ${this._conditions.join(' AND ')}`);
    }

    if (this._groupBy) {
      parts.push(`GROUP BY ${this._groupBy}`);
    }

    // Don't include limit/offset/orderBy in count query
    return { sql: parts.join(' '), params: [...this._params] };
  }
}
