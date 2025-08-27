import { Database } from './database';
import bcrypt from 'bcryptjs';

// TypeScript interfaces
export interface User {
  id: number;
  email: string;
  name: string;
  password?: string;
  role: 'CITIZEN' | 'ADMIN';
  points: number;
  created_at: Date;
  updated_at: Date;
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
  }): Promise<number> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const sql = `
      INSERT INTO users (email, name, password, role, points)
      VALUES (?, ?, ?, ?, 0)
    `;
    return await Database.insert(sql, [
      userData.email,
      userData.name,
      hashedPassword,
      userData.role || 'CITIZEN',
    ]);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return await Database.queryOne(sql, [email]);
  }

  static async findById(id: number): Promise<User | null> {
    const sql = 'SELECT id, email, name, role, points, created_at, updated_at FROM users WHERE id = ?';
    return await Database.queryOne(sql, [id]);
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePoints(userId: number, points: number): Promise<void> {
    const sql = 'UPDATE users SET points = points + ? WHERE id = ?';
    await Database.update(sql, [points, userId]);
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
  }

  static async getAll(): Promise<User[]> {
    const sql = 'SELECT id, email, name, role, points, created_at, updated_at FROM users ORDER BY created_at DESC';
    return await Database.query(sql);
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
    return await Database.insert(sql, [
      issueData.title,
      issueData.description,
      issueData.category,
      issueData.priority,
      issueData.latitude,
      issueData.longitude,
      issueData.address,
      issueData.image_url,
      issueData.reporter_id,
    ]);
  }

  static async findById(id: number): Promise<Issue | null> {
    const sql = `
      SELECT i.*, u.name as reporter_name,
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
      SELECT i.*, u.name as reporter_name,
             (SELECT COUNT(*) FROM votes WHERE issue_id = i.id) as votes_count,
             (SELECT COUNT(*) FROM comments WHERE issue_id = i.id) as comments_count
      FROM issues i
      JOIN users u ON i.reporter_id = u.id
      ORDER BY i.created_at DESC
      LIMIT 50
    `;
    
    return await Database.query(sql, []);
  }

  static async updateStatus(id: number, status: string): Promise<void> {
    const sql = 'UPDATE issues SET status = ?, updated_at = NOW() WHERE id = ?';
    await Database.update(sql, [status, id]);
  }

  static async delete(id: number): Promise<void> {
    const sql = 'DELETE FROM issues WHERE id = ?';
    await Database.delete(sql, [id]);
  }

  static async getByLocation(lat: number, lng: number, radius: number = 5): Promise<Issue[]> {
    const sql = `
      SELECT i.*, u.name as reporter_name,
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
}

// Comment model
export class CommentModel {
  static async create(commentData: {
    content: string;
    issue_id: number;
    author_id: number;
  }): Promise<number> {
    const sql = 'INSERT INTO comments (content, issue_id, author_id) VALUES (?, ?, ?)';
    return await Database.insert(sql, [
      commentData.content,
      commentData.issue_id,
      commentData.author_id,
    ]);
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
    return await Database.insert(sql, [voteData.issue_id, voteData.user_id]);
  }

  static async findByIssueAndUser(issueId: number, userId: number): Promise<Vote | null> {
    const sql = 'SELECT * FROM votes WHERE issue_id = ? AND user_id = ?';
    return await Database.queryOne(sql, [issueId, userId]);
  }

  static async delete(issueId: number, userId: number): Promise<void> {
    const sql = 'DELETE FROM votes WHERE issue_id = ? AND user_id = ?';
    await Database.delete(sql, [issueId, userId]);
  }

  static async getCountByIssue(issueId: number): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM votes WHERE issue_id = ?';
    const result = await Database.queryOne(sql, [issueId]);
    return result ? result.count : 0;
  }

  static async deleteByIssueId(issueId: number): Promise<void> {
    const sql = 'DELETE FROM votes WHERE issue_id = ?';
    await Database.delete(sql, [issueId]);
  }
}
