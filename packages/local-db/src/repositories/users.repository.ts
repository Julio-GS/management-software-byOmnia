import { Database } from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import type { DbUser, CreateUserDTO, UpdateUserDTO } from '../models';
import { validateEmail, validateRole } from '../utils/validators';

export class UsersRepository extends BaseRepository<
  DbUser,
  CreateUserDTO,
  UpdateUserDTO
> {
  constructor(db: Database) {
    super(db, 'users');
  }

  /**
   * Override create to add validation
   */
  override create(data: CreateUserDTO): DbUser {
    // Validate email
    if (!validateEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Validate role
    if (!validateRole(data.role)) {
      throw new Error(
        'Invalid role. Must be one of: admin, cashier, manager, viewer'
      );
    }

    // Check for duplicate email
    if (this.findByEmail(data.email)) {
      throw new Error('User with this email already exists');
    }

    return super.create(data);
  }

  /**
   * Override update to add validation
   */
  override update(id: string, data: UpdateUserDTO): DbUser | null {
    if (data.email) {
      if (!validateEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      // Check for duplicate email (excluding current user)
      const existing = this.findByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new Error('User with this email already exists');
      }
    }

    if (data.role && !validateRole(data.role)) {
      throw new Error(
        'Invalid role. Must be one of: admin, cashier, manager, viewer'
      );
    }

    return super.update(id, data);
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): DbUser | null {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE email = ? AND is_deleted = 0
    `);

    return stmt.get(email) as DbUser | null;
  }

  /**
   * Find users by role
   */
  findByRole(role: string): DbUser[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE role = ? AND is_deleted = 0
      ORDER BY name ASC
    `);

    return stmt.all(role) as DbUser[];
  }

  /**
   * Search users by name or email
   */
  search(query: string): DbUser[] {
    const searchTerm = `%${query}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE (name LIKE ? OR email LIKE ?)
      AND is_deleted = 0
      ORDER BY name ASC
    `);

    return stmt.all(searchTerm, searchTerm) as DbUser[];
  }

  /**
   * Check if email exists (for registration validation)
   */
  emailExists(email: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE email = ? AND is_deleted = 0
    `);

    const result = stmt.get(email) as { count: number };
    return result.count > 0;
  }

  /**
   * Get all active cashiers
   */
  getActiveCashiers(): DbUser[] {
    return this.findByRole('cashier');
  }

  /**
   * Get all active managers
   */
  getActiveManagers(): DbUser[] {
    return this.findByRole('manager');
  }

  /**
   * Get all active admins
   */
  getActiveAdmins(): DbUser[] {
    return this.findByRole('admin');
  }

  /**
   * Count users by role
   */
  countByRole(role: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE role = ? AND is_deleted = 0
    `);

    const result = stmt.get(role) as { count: number };
    return result.count;
  }

  /**
   * Get users created in date range
   */
  findCreatedInRange(startDate: string, endDate: string): DbUser[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ${this.tableName}
      WHERE created_at >= ? AND created_at <= ?
      AND is_deleted = 0
      ORDER BY created_at DESC
    `);

    return stmt.all(startDate, endDate) as DbUser[];
  }

  /**
   * Update password hash
   */
  updatePassword(id: string, passwordHash: string): void {
    const stmt = this.db.prepare(`
      UPDATE ${this.tableName}
      SET password_hash = ?, updated_at = ?, is_dirty = 1, version = version + 1
      WHERE id = ? AND is_deleted = 0
    `);

    const now = new Date().toISOString();
    const result = stmt.run(passwordHash, now, id);

    if (result.changes === 0) {
      throw new Error('User not found or already deleted');
    }
  }

  /**
   * Verify user credentials (returns user if password hash matches)
   * Note: Actual password verification should be done in the service layer
   * This method just retrieves the user with password hash for verification
   */
  getUserForAuthentication(email: string): DbUser | null {
    return this.findByEmail(email);
  }

  /**
   * Get user statistics
   */
  getUserStats(): {
    total: number;
    byRole: Record<string, number>;
  } {
    const total = this.count();

    const stmt = this.db.prepare(`
      SELECT role, COUNT(*) as count
      FROM ${this.tableName}
      WHERE is_deleted = 0
      GROUP BY role
    `);

    const roleStats = stmt.all() as Array<{ role: string; count: number }>;
    const byRole: Record<string, number> = {};

    for (const stat of roleStats) {
      byRole[stat.role] = stat.count;
    }

    return { total, byRole };
  }
}
