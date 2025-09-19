import { Database } from './database';
import bcrypt from 'bcryptjs';
import { IssueStatus } from './types';

// TypeScript interfaces
export interface User {
  id: number;
  email: string;
  name: string;
  password?: string;
  role: 'CITIZEN' | 'ADMIN' | 'ORGANIZATION_ADMIN' | 'NGO_ADMIN';
  points: number;
  is_verified: boolean;
  verification_token?: string;
  verification_token_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserOrganization {
  id: number;
  user_id: number;
  organization_id: number;
  role: 'ORGANIZATION_ADMIN' | 'MEMBER';
  employee_id?: string;
  position?: string;
  is_active: boolean;
  assigned_at: Date;
  assigned_by?: number;
  // Joined data
  user?: User;
  organization?: Organization;
  assigned_by_user?: User;
}

export interface CategoryOrganizationMapping {
  id: number;
  category: string;
  organization_id: number;
  is_primary: boolean;
  created_at: Date;
  // Joined data
  organization?: Organization;
}

export interface IssueAssignment {
  id: number;
  issue_id: number;
  organization_id: number;
  assigned_at: Date;
  assigned_by?: number;
  // Joined data
  organization?: Organization;
  assigned_by_user?: User;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  latitude: number;
  longitude: number;
  address: string;
  image_url?: string;
  reporter_id: number;
  votes_count: number;
  comments_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Comment {
  id: number;
  content: string;
  issue_id: number;
  author_id: number;
  author_name: string;
  created_at: Date;
}

export interface Vote {
  id: number;
  issue_id: number;
  user_id: number;
  created_at: Date;
}

// User model
export class UserModel {
  static async create(userData: {
    email: string;
    name: string;
    password: string;
    role?: 'CITIZEN' | 'ADMIN';
    verification_token?: string;
    verification_token_expires?: Date;
  }): Promise<number> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const sql = `
      INSERT INTO users (email, name, password, role, points, is_verified, verification_token, verification_token_expires)
      VALUES (?, ?, ?, ?, 0, FALSE, ?, ?)
    `;
    const userId = await Database.insert(sql, [
      userData.email,
      userData.name,
      hashedPassword,
      userData.role || 'CITIZEN',
      userData.verification_token || null,
      userData.verification_token_expires || null,
    ]);

    // Invalidate user-related caches
    
    return userId;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return await Database.queryOne(sql, [email]);
  }

  static async findById(id: number): Promise<User | null> {
    const sql = 'SELECT id, email, name, role, points, is_verified, created_at, updated_at FROM users WHERE id = ?';
    return await Database.queryOne(sql, [id]);
  }

  static async findByVerificationToken(token: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE verification_token = ? AND verification_token_expires > NOW()';
    return await Database.queryOne(sql, [token]);
  }

  static async verifyEmail(token: string): Promise<boolean> {
    const sql = `
      UPDATE users 
      SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL 
      WHERE verification_token = ? AND verification_token_expires > NOW()
    `;
    const result = await Database.update(sql, [token]);
    
    if (result > 0) {
      // Invalidate user-related caches
    }
    
    return result > 0;
  }

  static async updateVerificationToken(email: string, token: string, expires: Date): Promise<void> {
    const sql = 'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE email = ?';
    await Database.update(sql, [token, expires, email]);
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePoints(userId: number, points: number): Promise<void> {
    const sql = 'UPDATE users SET points = points + ? WHERE id = ?';
    await Database.update(sql, [points, userId]);
    
    // Invalidate user-related caches
  }

  static async updateProfile(userId: number, profileData: { name?: string; email?: string }): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (profileData.name) {
      updates.push('name = ?');
      values.push(profileData.name);
    }

    if (profileData.email) {
      updates.push('email = ?');
      values.push(profileData.email);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await Database.update(sql, values);
    
    // Invalidate user-related caches
  }

  static async updateRole(userId: number, role: 'CITIZEN' | 'ADMIN' | 'ORGANIZATION_ADMIN' | 'NGO_ADMIN'): Promise<void> {
    const sql = 'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await Database.update(sql, [role, userId]);
    
    // Note: Cache invalidation should be handled in the API route that calls this method
  }

  static async getAll(): Promise<User[]> {
    const sql = 'SELECT id, email, name, role, points, is_verified, created_at, updated_at FROM users ORDER BY created_at DESC';
    return await Database.query(sql);
  }

  static async getUserOrganizationId(userId: number): Promise<number | null> {
    const sql = `
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = ? AND is_active = 1
      LIMIT 1
    `;
    const result = await Database.queryOne(sql, [userId]) as { organization_id: number } | null;
    return result?.organization_id || null;
  }

  static async checkUserByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT id, email, name, role, is_verified, created_at FROM users WHERE email = ?';
    return await Database.queryOne(sql, [email]);
  }
}

// Issue model
export class IssueModel {
  static async create(issueData: {
    title: string;
    description: string;
    category: string;
    priority: string;
    latitude: number;
    longitude: number;
    address: string;
    image_url?: string;
    reporter_id: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO issues (title, description, category, priority, latitude, longitude, address, image_url, reporter_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const issueId = await Database.insert(sql, [
      issueData.title,
      issueData.description,
      issueData.category,
      issueData.priority,
      issueData.latitude,
      issueData.longitude,
      issueData.address,
      issueData.image_url || null,
      issueData.reporter_id,
    ]);

    // Invalidate issue-related caches
    
    return issueId;
  }

  static async findById(id: number): Promise<Issue | null> {
    const sql = `
      SELECT i.*, u.name as reporter_name, u.role as reporter_role,
             (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes_count,
             (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comments_count
      FROM issues i
      JOIN users u ON i.reporter_id = u.id
      WHERE i.id = ?
    `;
    return await Database.queryOne(sql, [id]);
  }

  static async getAll(filters?: {
    category?: string;
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<Issue[]> {
    // For now, let's simplify and just get all issues without complex filtering
    const sql = `
      SELECT i.*, u.name as reporter_name, u.role as reporter_role,
             (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes_count,
             (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comments_count
      FROM issues i
      JOIN users u ON i.reporter_id = u.id
      ORDER BY i.created_at DESC
      LIMIT 50
    `;

    return await Database.query(sql, []);
  }

  static async updateStatus(id: number, status: string): Promise<{ email: string, name: string, title: string } | null> {

    type IssueRow = { status: IssueStatus }
    const currentSql = `
      SELECT status FROM issues WHERE id = ?
    `
    const current = await Database.queryOne<IssueRow>(currentSql, [id]);
    if (!current) return null

    const currentStatus = current.status
    const validTransition: Record<IssueStatus, IssueStatus> = {
      PENDING: "IN_PROGRESS",
      IN_PROGRESS: "RESOLVED",
      RESOLVED: "RESOLVED",
      REMOVED: "REMOVED",
    }

    if (validTransition[currentStatus] !== status) {
      throw new Error(`Invalid status transition: ${currentStatus} → ${status}`);
    }

    const updateSql = `
      UPDATE issues
      SET status = ?, updated_at = NOW()
      WHERE id = ?;
    `;
    await Database.query(updateSql, [status, id]);

    // Note: Cache invalidation handled in API routes that call this method

    const selectSql = `
      SELECT u.email, u.name, i.title
      FROM issues i
      JOIN users u ON i.reporter_id = u.id
      WHERE i.id = ?;
    `;
    return await Database.queryOne(selectSql, [id]);
  }


  static async delete(id: number): Promise<void> {
    const sql = 'DELETE FROM issues WHERE id = ?';
    await Database.delete(sql, [id]);
    
    // Invalidate issue-related caches
  }

  static async getByLocation(lat: number, lng: number, radius: number = 5): Promise<Issue[]> {
    const sql = `
      SELECT i.*, u.name as reporter_name, u.role as reporter_role,
             (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes_count,
             (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comments_count,
             (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance
      FROM issues i
      JOIN users u ON i.reporter_id = u.id
      HAVING distance < ?
      ORDER BY distance
    `;
    return await Database.query(sql, [lat, lng, lat, radius]);
  }

  static async getOrganizationStats(organizationId: number): Promise<{
    totalIssues: number;
    pendingIssues: number;
    inProgressIssues: number;
    resolvedIssues: number;
    teamMembers: number;
    categoriesHandled: string[];
  }> {
    try {
      // Get team member count first
      const teamMembersSql = `
        SELECT COUNT(*) as teamMembers
        FROM user_organizations 
        WHERE organization_id = ? AND is_active = 1
      `;
      const teamMembersResult = await Database.queryOne(teamMembersSql, [organizationId]) as { teamMembers: number } | null;
      const teamMembers = teamMembersResult?.teamMembers || 0;

      // Try to get categories handled by this organization
      let categoriesHandled: string[] = [];
      try {
        const categoriesSql = `
          SELECT DISTINCT category
          FROM category_organization_mappings
          WHERE organization_id = ?
        `;
        const categoriesResult = await Database.query(categoriesSql, [organizationId]);
        categoriesHandled = categoriesResult.map((row: any) => row.category);
      } catch (categoryError) {
        console.log('Category mappings table not found or empty, using all categories as fallback');
        // Fallback: if category mappings don't exist, assume organization handles all categories
        categoriesHandled = ['ROADS', 'LIGHTING', 'SANITATION', 'PARKS', 'UTILITIES', 'SAFETY'];
      }

      // If no categories are mapped and the table exists, return empty stats
      if (categoriesHandled.length === 0) {
        return {
          totalIssues: 0,
          pendingIssues: 0,
          inProgressIssues: 0,
          resolvedIssues: 0,
          teamMembers,
          categoriesHandled: []
        };
      }

      // Get issue statistics for categories handled by this organization
      const placeholders = categoriesHandled.map(() => '?').join(',');
      const issueStatsSql = `
        SELECT 
          COUNT(*) as totalIssues,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingIssues,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as inProgressIssues,
          SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolvedIssues
        FROM issues i
        WHERE i.category IN (${placeholders})
      `;
      
      const issueStats = await Database.queryOne(issueStatsSql, categoriesHandled) as {
        totalIssues: number;
        pendingIssues: number;
        inProgressIssues: number;
        resolvedIssues: number;
      } | null;

      return {
        totalIssues: issueStats?.totalIssues || 0,
        pendingIssues: issueStats?.pendingIssues || 0,
        inProgressIssues: issueStats?.inProgressIssues || 0,
        resolvedIssues: issueStats?.resolvedIssues || 0,
        teamMembers,
        categoriesHandled
      };
    } catch (error) {
      console.error('Error getting organization stats:', error);
      return {
        totalIssues: 0,
        pendingIssues: 0,
        inProgressIssues: 0,
        resolvedIssues: 0,
        teamMembers: 0,
        categoriesHandled: ['ROADS', 'LIGHTING', 'SANITATION', 'PARKS', 'UTILITIES', 'SAFETY'] // Fallback to all categories
      };
    }
  }

  static async getOrganizationRecentIssues(organizationId: number, limit: number = 5): Promise<any[]> {
    try {
      // Ensure limit is a valid positive integer
      const sanitizedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
      
      // Get categories handled by this organization
      const categoriesSql = `
        SELECT DISTINCT category
        FROM category_organization_mappings
        WHERE organization_id = ?
      `;
      const categoriesResult = await Database.query(categoriesSql, [organizationId]);
      const categoriesHandled = categoriesResult.map((row: any) => row.category);

      // If no categories are mapped, return empty array
      if (categoriesHandled.length === 0) {
        return [];
      }

      // Get recent issues for categories handled by this organization
      const placeholders = categoriesHandled.map(() => '?').join(',');
      const sql = `
        SELECT i.*, u.name as citizen_name, u.email as citizen_email,
               (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes,
               assigned_users.name as assigned_to_name
        FROM issues i
        JOIN users u ON i.reporter_id = u.id
        LEFT JOIN users assigned_users ON i.assigned_to = assigned_users.id
        WHERE i.category IN (${placeholders})
        ORDER BY i.created_at DESC
        LIMIT ${sanitizedLimit}
      `;
      
      return await Database.query(sql, categoriesHandled);
    } catch (error) {
      console.error('Error getting organization recent issues:', error);
      return [];
    }
  }

  static async getOrganizationDetails(organizationId: number): Promise<any> {
    try {
      const sql = `
        SELECT id, name, description, email, phone, address
        FROM organizations
        WHERE id = ?
      `;
      
      return await Database.queryOne(sql, [organizationId]);
    } catch (error) {
      console.error('Error getting organization details:', error);
      return null;
    }
  }

  static async getOrganizationIssues(organizationId: number, filters?: {
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      // Get categories handled by this organization
      const categoriesSql = `
        SELECT DISTINCT category
        FROM category_organization_mappings
        WHERE organization_id = ?
      `;
      const categoriesResult = await Database.query(categoriesSql, [organizationId]);
      const categories = categoriesResult.map((row: any) => row.category);
      
      if (categories.length === 0) {
        return []; // No categories mapped, return empty array
      }
      
      // Build the main query
      let sql = `
        SELECT i.*, u.name as citizen_name, u.email as citizen_email,
               (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes,
               assigned_users.name as assigned_to_name
        FROM issues i
        JOIN users u ON i.reporter_id = u.id
        LEFT JOIN users assigned_users ON i.assigned_to = assigned_users.id
        WHERE i.category IN (${categories.map(() => '?').join(', ')})
      `;
      
      const params: any[] = [...categories];
      
      if (filters?.status) {
        sql += ' AND i.status = ?';
        params.push(filters.status);
      }
      
      if (filters?.category) {
        sql += ' AND i.category = ?';
        params.push(filters.category);
      }
      
      if (filters?.priority) {
        sql += ' AND i.priority = ?';
        params.push(filters.priority);
      }
      
      if (filters?.search) {
        sql += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.address LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      sql += ' ORDER BY i.created_at DESC';
      
      if (filters?.limit) {
        // Sanitize limit and offset to prevent injection and ensure valid values
        const sanitizedLimit = Math.max(1, Math.min(1000, Math.floor(filters.limit)));
        sql += ` LIMIT ${sanitizedLimit}`;
        
        if (filters?.offset) {
          const sanitizedOffset = Math.max(0, Math.floor(filters.offset));
          sql += ` OFFSET ${sanitizedOffset}`;
        }
      }
      
      return await Database.query(sql, params);
    } catch (error) {
      console.error('Error getting organization issues:', error);
      return [];
    }
  }
}

// Comment model
export class CommentModel {
  static async create(commentData: {
    content: string;
    issue_id: number;
    author_id: number;
  }): Promise<number> {
    const sql = 'INSERT INTO comments (content, issue_id, author_id) VALUES (?, ?, ?)';
    const commentId = await Database.insert(sql, [
      commentData.content,
      commentData.issue_id,
      commentData.author_id,
    ]);

    // Note: Cache invalidation handled in API routes that call this method
    
    return commentId;
  }

  static async getByIssueId(issueId: number): Promise<Comment[]> {
    const sql = `
      SELECT c.*, u.name as author_name
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.issue_id = ?
      ORDER BY c.created_at ASC
    `;
    return await Database.query(sql, [issueId]);
  }

  static async delete(id: number): Promise<void> {
    const sql = 'DELETE FROM comments WHERE id = ?';
    await Database.delete(sql, [id]);
    
    // Invalidate issue-related caches since comments affect issue details
  }

  static async deleteByIssueId(issueId: number): Promise<void> {
    const sql = 'DELETE FROM comments WHERE issue_id = ?';
    await Database.delete(sql, [issueId]);
  }
}

// Vote model
export class VoteModel {
  static async create(voteData: { issue_id: number; user_id: number }): Promise<number> {
    const sql = 'INSERT INTO votes (issue_id, user_id) VALUES (?, ?)';
    const voteId = await Database.insert(sql, [voteData.issue_id, voteData.user_id]);
    
    // Note: Cache invalidation handled in API routes that call this method
    
    return voteId;
  }

  static async findByIssueAndUser(issueId: number, userId: number): Promise<Vote | null> {
    const sql = 'SELECT * FROM votes WHERE issue_id = ? AND user_id = ?';
    return await Database.queryOne(sql, [issueId, userId]);
  }

  static async delete(issueId: number, userId: number): Promise<void> {
    const sql = 'DELETE FROM votes WHERE issue_id = ? AND user_id = ?';
    await Database.delete(sql, [issueId, userId]);
    
    // Invalidate issue-related caches since votes affect issue details
    // Note: Cache invalidation handled in API routes that call this method
  }

  static async getCountByIssue(issueId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM votes WHERE issue_id = ?';
    const result = await Database.queryOne<{ count: number }>(sql, [issueId]);
    return result ? result.count : 0;
  }

  static async deleteByIssueId(issueId: number): Promise<void> {
    const sql = 'DELETE FROM votes WHERE issue_id = ?';
    await Database.delete(sql, [issueId]);
  }
}

// Organization model
export class OrganizationModel {
  static async create(orgData: {
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO organizations (name, description, email, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `;
    const orgId = await Database.insert(sql, [
      orgData.name,
      orgData.description || null,
      orgData.email || null,
      orgData.phone || null,
      orgData.address || null,
    ]);

    // Invalidate organization-related caches
    
    return orgId;
  }

  static async findById(id: number): Promise<Organization | null> {
    const sql = 'SELECT * FROM organizations WHERE id = ? AND is_active = TRUE';
    return await Database.queryOne(sql, [id]);
  }

  static async findByName(name: string): Promise<Organization | null> {
    const sql = 'SELECT * FROM organizations WHERE name = ? AND is_active = TRUE';
    return await Database.queryOne(sql, [name]);
  }

  static async getAll(includeInactive: boolean = false): Promise<Organization[]> {
    const sql = includeInactive 
      ? 'SELECT * FROM organizations ORDER BY name ASC'
      : 'SELECT * FROM organizations WHERE is_active = TRUE ORDER BY name ASC';
    return await Database.query(sql);
  }

  static async update(id: number, orgData: {
    name?: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    is_active?: boolean;
  }): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(orgData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) return;

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`;
    await Database.update(sql, values);
    
    // Invalidate organization-related caches
  }

  static async delete(id: number): Promise<void> {
    const sql = 'UPDATE organizations SET is_active = FALSE WHERE id = ?';
    await Database.update(sql, [id]);
    
    // Invalidate organization-related caches
  }

  static async getByCategory(category: string): Promise<Organization[]> {
    const sql = `
      SELECT o.*, com.is_primary
      FROM organizations o
      JOIN category_organization_mappings com ON o.id = com.organization_id
      WHERE com.category = ? AND o.is_active = TRUE
      ORDER BY com.is_primary DESC, o.name ASC
    `;
    return await Database.query(sql, [category]);
  }
}

// UserOrganization model
export class UserOrganizationModel {
  static async create(data: {
    user_id: number;
    organization_id: number;
    role: 'ORGANIZATION_ADMIN' | 'MEMBER';
    employee_id?: string;
    position?: string;
    assigned_by?: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO user_organizations (user_id, organization_id, role, employee_id, position, assigned_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const userOrgId = await Database.insert(sql, [
      data.user_id,
      data.organization_id,
      data.role,
      data.employee_id || null,
      data.position || null,
      data.assigned_by || null,
    ]);

    // Invalidate user and organization related caches
    
    return userOrgId;
  }

  static async findByUserAndOrganization(userId: number, organizationId: number): Promise<UserOrganization | null> {
    const sql = 'SELECT * FROM user_organizations WHERE user_id = ? AND organization_id = ? AND is_active = TRUE';
    return await Database.queryOne(sql, [userId, organizationId]);
  }

  static async getByUser(userId: number): Promise<UserOrganization[]> {
    const sql = `
      SELECT uo.*, o.name as organization_name, o.description as organization_description
      FROM user_organizations uo
      JOIN organizations o ON uo.organization_id = o.id
      WHERE uo.user_id = ? AND uo.is_active = TRUE AND o.is_active = TRUE
      ORDER BY o.name ASC
    `;
    return await Database.query(sql, [userId]);
  }

  static async getByOrganization(organizationId: number): Promise<UserOrganization[]> {
    const sql = `
      SELECT uo.*, u.name as user_name, u.email as user_email, u.role as user_role,
             ab.name as assigned_by_name
      FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      LEFT JOIN users ab ON uo.assigned_by = ab.id
      WHERE uo.organization_id = ? AND uo.is_active = TRUE
      ORDER BY uo.role ASC, u.name ASC
    `;
    return await Database.query(sql, [organizationId]);
  }

  static async update(id: number, data: {
    role?: 'ORGANIZATION_ADMIN' | 'MEMBER';
    employee_id?: string;
    position?: string;
    is_active?: boolean;
  }): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) return;

    values.push(id);
    const sql = `UPDATE user_organizations SET ${updates.join(', ')} WHERE id = ?`;
    await Database.update(sql, values);
    
    // Invalidate user and organization related caches
  }

  static async remove(userId: number, organizationId: number): Promise<void> {
    const sql = 'UPDATE user_organizations SET is_active = FALSE WHERE user_id = ? AND organization_id = ?';
    await Database.update(sql, [userId, organizationId]);
    
    // Invalidate user and organization related caches
  }

  static async isOrganizationAdmin(userId: number, organizationId: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM user_organizations 
      WHERE user_id = ? AND organization_id = ? AND role = 'ORGANIZATION_ADMIN' AND is_active = TRUE
    `;
    const result = await Database.queryOne<{ count: number }>(sql, [userId, organizationId]);
    return result ? result.count > 0 : false;
  }

  static async getOrganizationMembersWithStats(organizationId: number): Promise<any[]> {
    const sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        uo.role,
        uo.employee_id,
        uo.position as department,
        uo.assigned_at as joined_at,
        u.updated_at as last_active,
        CASE WHEN u.updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'ACTIVE' ELSE 'INACTIVE' END as status,
        0 as issues_assigned,
        0 as issues_resolved
      FROM user_organizations uo
      JOIN users u ON uo.user_id = u.id
      WHERE uo.organization_id = ? AND uo.is_active = TRUE
      ORDER BY uo.role ASC, u.name ASC
    `;
    return await Database.query(sql, [organizationId]);
  }

  static async getEmployeeId(userId: number, organizationId: number): Promise<string | null> {
    const sql = `
      SELECT employee_id 
      FROM user_organizations 
      WHERE user_id = ? AND organization_id = ? AND is_active = TRUE
    `;
    const result = await Database.queryOne<{ employee_id: string | null }>(sql, [userId, organizationId]);
    return result ? result.employee_id : null;
  }
}

// CategoryOrganizationMapping model
export class CategoryOrganizationMappingModel {
  static async create(data: {
    category: string;
    organization_id: number;
    is_primary?: boolean;
  }): Promise<number> {
    const sql = `
      INSERT INTO category_organization_mappings (category, organization_id, is_primary)
      VALUES (?, ?, ?)
    `;
    return await Database.insert(sql, [
      data.category,
      data.organization_id,
      data.is_primary || false,
    ]);
  }

  static async getByCategory(category: string): Promise<CategoryOrganizationMapping[]> {
    const sql = `
      SELECT com.*, o.name as organization_name, o.email as organization_email
      FROM category_organization_mappings com
      JOIN organizations o ON com.organization_id = o.id
      WHERE com.category = ? AND o.is_active = TRUE
      ORDER BY com.is_primary DESC, o.name ASC
    `;
    return await Database.query(sql, [category]);
  }

  static async getByOrganization(organizationId: number): Promise<CategoryOrganizationMapping[]> {
    const sql = 'SELECT * FROM category_organization_mappings WHERE organization_id = ? ORDER BY category ASC';
    return await Database.query(sql, [organizationId]);
  }

  static async setPrimary(category: string, organizationId: number): Promise<void> {
    // First, remove primary status from all other organizations for this category
    await Database.update(
      'UPDATE category_organization_mappings SET is_primary = FALSE WHERE category = ?',
      [category]
    );
    
    // Then set the specified organization as primary
    await Database.update(
      'UPDATE category_organization_mappings SET is_primary = TRUE WHERE category = ? AND organization_id = ?',
      [category, organizationId]
    );
  }

  static async remove(category: string, organizationId: number): Promise<void> {
    const sql = 'DELETE FROM category_organization_mappings WHERE category = ? AND organization_id = ?';
    await Database.delete(sql, [category, organizationId]);
  }
}

// IssueAssignment model
export class IssueAssignmentModel {
  static async create(data: {
    issue_id: number;
    organization_id: number;
    assigned_by?: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO issue_assignments (issue_id, organization_id, assigned_by)
      VALUES (?, ?, ?)
    `;
    const result = await Database.insert(sql, [
      data.issue_id,
      data.organization_id,
      data.assigned_by || null,
    ]);
    
    // Invalidate cache after assignment is created
    // Note: Cache invalidation handled in API routes that call this method
    
    return result;
  }

  static async getByIssue(issueId: number): Promise<IssueAssignment[]> {
    const sql = `
      SELECT ia.*, o.name as organization_name, o.email as organization_email,
             u.name as assigned_by_name
      FROM issue_assignments ia
      JOIN organizations o ON ia.organization_id = o.id
      LEFT JOIN users u ON ia.assigned_by = u.id
      WHERE ia.issue_id = ?
      ORDER BY ia.assigned_at ASC
    `;
    return await Database.query(sql, [issueId]);
  }

  static async getByOrganization(organizationId: number): Promise<IssueAssignment[]> {
    const sql = `
      SELECT ia.*, i.title as issue_title, i.category as issue_category, 
             i.status as issue_status, i.priority as issue_priority
      FROM issue_assignments ia
      JOIN issues i ON ia.issue_id = i.id
      WHERE ia.organization_id = ?
      ORDER BY ia.assigned_at DESC
    `;
    return await Database.query(sql, [organizationId]);
  }

  static async assignIssueToOrganizations(issueId: number, assignedBy?: number): Promise<void> {
    // Get the issue details
    const issue = await IssueModel.findById(issueId);
    if (!issue) return;

    // Get organizations responsible for this category
    const mappings = await CategoryOrganizationMappingModel.getByCategory(issue.category);
    
    // Create assignments for each organization
    for (const mapping of mappings) {
      try {
        await IssueAssignmentModel.create({
          issue_id: issueId,
          organization_id: mapping.organization_id,
          assigned_by: assignedBy,
        });
      } catch (error) {
        // Ignore duplicate assignments
        console.error('Error creating assignment:', error);
      }
    }
    
    // Note: Cache invalidation handled in API routes that call this method
  }
}

// NGO Model
export class NGOModel {
  static async create(ngoData: {
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    registration_number?: string;
    contact_person?: string;
  }): Promise<number> {
    const sql = `
      INSERT INTO ngos (name, description, email, phone, address, registration_number, contact_person)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const ngoId = await Database.insert(sql, [
      ngoData.name,
      ngoData.description || null,
      ngoData.email || null,
      ngoData.phone || null,
      ngoData.address || null,
      ngoData.registration_number || null,
      ngoData.contact_person || null,
    ]);

    return ngoId;
  }

  static async findById(id: number): Promise<any | null> {
    const sql = 'SELECT * FROM ngos WHERE id = ?';
    const ngo: any = await Database.queryOne(sql, [id]);
    return ngo;
  }

  static async findByName(name: string): Promise<any | null> {
    const sql = 'SELECT * FROM ngos WHERE name = ?';
    const ngo: any = await Database.queryOne(sql, [name]);
    return ngo;
  }

  static async getAll(): Promise<any[]> {
    const sql = `
      SELECT 
        id, name, description, email, phone, address, 
        contact_person, registration_number, is_active, 
        created_at, updated_at
      FROM ngos 
      ORDER BY created_at DESC
    `;
    const ngos: any[] = await Database.query(sql, []);
    return ngos;
  }

  static async update(id: number, updateData: {
    name?: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    registration_number?: string;
    contact_person?: string;
    is_active?: boolean;
  }): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.name !== undefined) {
      fields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.email !== undefined) {
      fields.push('email = ?');
      values.push(updateData.email);
    }
    if (updateData.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updateData.phone);
    }
    if (updateData.address !== undefined) {
      fields.push('address = ?');
      values.push(updateData.address);
    }
    if (updateData.registration_number !== undefined) {
      fields.push('registration_number = ?');
      values.push(updateData.registration_number);
    }
    if (updateData.contact_person !== undefined) {
      fields.push('contact_person = ?');
      values.push(updateData.contact_person);
    }
    if (updateData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updateData.is_active);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = NOW()');
    values.push(id);

    const sql = `UPDATE ngos SET ${fields.join(', ')} WHERE id = ?`;
    const result: any = await Database.update(sql, values);
    return result.affectedRows > 0;
  }

  static async delete(id: number): Promise<boolean> {
    console.log(`🗑️ [NGO MODEL] Attempting to deactivate NGO ${id}`);
    const sql = 'UPDATE ngos SET is_active = FALSE WHERE id = ?';
    const affectedRows = await Database.update(sql, [id]);
    console.log(`🗑️ [NGO MODEL] Update result: affectedRows = ${affectedRows}`);
    return affectedRows > 0;
  }
}

// User-NGO relationship model
export class UserNGOModel {
  static async create(data: {
    user_id: number;
    ngo_id: number;
    role: 'NGO_ADMIN' | 'MEMBER';
    position?: string;
    assigned_by?: number;
  }): Promise<number> {
    const sql = `
      INSERT INTO user_ngos (user_id, ngo_id, role, position, assigned_by)
      VALUES (?, ?, ?, ?, ?)
    `;
    return await Database.insert(sql, [
      data.user_id,
      data.ngo_id,
      data.role,
      data.position || null,
      data.assigned_by || null,
    ]);
  }

  static async getByUser(userId: number): Promise<any[]> {
    const sql = `
      SELECT un.*, n.name as ngo_name, n.description as ngo_description,
             u_assigned.name as assigned_by_name
      FROM user_ngos un
      JOIN ngos n ON un.ngo_id = n.id
      LEFT JOIN users u_assigned ON un.assigned_by = u_assigned.id
      WHERE un.user_id = ? AND un.is_active = TRUE
      ORDER BY un.assigned_at DESC
    `;
    return await Database.query(sql, [userId]);
  }

  static async getByNGO(ngoId: number): Promise<any[]> {
    const sql = `
      SELECT un.*, u.name as user_name, u.email as user_email,
             u_assigned.name as assigned_by_name
      FROM user_ngos un
      JOIN users u ON un.user_id = u.id
      LEFT JOIN users u_assigned ON un.assigned_by = u_assigned.id
      WHERE un.ngo_id = ? AND un.is_active = TRUE
      ORDER BY un.assigned_at DESC
    `;
    return await Database.query(sql, [ngoId]);
  }

  static async findByUserAndNGO(userId: number, ngoId: number): Promise<any | null> {
    const sql = `
      SELECT un.*, n.name as ngo_name, u.name as user_name
      FROM user_ngos un
      JOIN ngos n ON un.ngo_id = n.id
      JOIN users u ON un.user_id = u.id
      WHERE un.user_id = ? AND un.ngo_id = ? AND un.is_active = TRUE
    `;
    return await Database.queryOne(sql, [userId, ngoId]);
  }

  static async getUserNGOId(userId: number): Promise<number | null> {
    const sql = `
      SELECT ngo_id 
      FROM user_ngos 
      WHERE user_id = ? AND role = 'NGO_ADMIN' AND is_active = TRUE 
      LIMIT 1
    `;
    const result: any = await Database.queryOne(sql, [userId]);
    return result ? result.ngo_id : null;
  }

  // Helper method to associate an existing NGO_ADMIN user with an NGO
  static async associateUserWithNGO(userId: number, ngoId: number, assignedBy: number): Promise<number> {
    // First check if association already exists
    const existing = await this.findByUserAndNGO(userId, ngoId);
    if (existing) {
      throw new Error('User is already associated with this NGO');
    }

    return await this.create({
      user_id: userId,
      ngo_id: ngoId,
      role: 'NGO_ADMIN',
      position: 'Administrator',
      assigned_by: assignedBy
    });
  }

  static async remove(userId: number, ngoId: number): Promise<boolean> {
    const sql = 'UPDATE user_ngos SET is_active = FALSE WHERE user_id = ? AND ngo_id = ?';
    const affectedRows = await Database.update(sql, [userId, ngoId]);
    return affectedRows > 0;
  }
}

// NGO Priority Notification Model
export class NGOPriorityNotificationModel {
  static async create(data: {
    issue_id: number;
    ngo_id: number;
    priority_level: 'HIGH' | 'URGENT';
  }): Promise<number> {
    const sql = `
      INSERT INTO ngo_priority_notifications (issue_id, ngo_id, priority_level)
      VALUES (?, ?, ?)
    `;
    return await Database.insert(sql, [
      data.issue_id,
      data.ngo_id,
      data.priority_level,
    ]);
  }

  static async markAsSent(id: number): Promise<boolean> {
    const sql = 'UPDATE ngo_priority_notifications SET notification_sent = TRUE, sent_at = NOW() WHERE id = ?';
    const affectedRows = await Database.update(sql, [id]);
    return affectedRows > 0;
  }

  static async getByIssue(issueId: number): Promise<any[]> {
    const sql = `
      SELECT npn.*, n.name as ngo_name
      FROM ngo_priority_notifications npn
      JOIN ngos n ON npn.ngo_id = n.id
      WHERE npn.issue_id = ?
      ORDER BY npn.created_at DESC
    `;
    return await Database.query(sql, [issueId]);
  }

  static async getPendingNotifications(): Promise<any[]> {
    const sql = `
      SELECT npn.*, n.name as ngo_name, i.title as issue_title
      FROM ngo_priority_notifications npn
      JOIN ngos n ON npn.ngo_id = n.id
      JOIN issues i ON npn.issue_id = i.id
      WHERE npn.notification_sent = FALSE
      ORDER BY npn.created_at ASC
    `;
    return await Database.query(sql, []);
  }
}
