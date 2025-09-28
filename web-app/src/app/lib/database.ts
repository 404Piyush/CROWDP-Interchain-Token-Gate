import { connectToDatabase } from './mongodb';

export interface Role {
  _id?: string;
  name: string;
  discordRoleId: string;
  amountThreshold?: number; // Optional - if not set, it's for all holders
  type: 'holder' | 'amount'; // 'holder' for all holders, 'amount' for specific threshold
  description?: string; // Optional description for the role
  color?: string; // Optional color for UI display
  createdAt: Date;
  updatedAt: Date;
}

export class RoleDatabase {
  private static async getCollection() {
    const { db } = await connectToDatabase();
    return db.collection<Role>('roles');
  }

  static async addRole(roleData: Omit<Role, '_id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const collection = await this.getCollection();
    
    const role: Omit<Role, '_id'> = {
      ...roleData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(role);
    return { ...role, _id: result.insertedId.toString() };
  }

  static async getAllRoles(): Promise<Role[]> {
    const collection = await this.getCollection();
    const roles = await collection.find({}).toArray();
    return roles.map(role => ({
      ...role,
      _id: role._id?.toString()
    }));
  }

  static async getRolesByType(type: 'holder' | 'amount'): Promise<Role[]> {
    const collection = await this.getCollection();
    const roles = await collection.find({ type }).toArray();
    return roles.map(role => ({
      ...role,
      _id: role._id?.toString()
    }));
  }

  static async deleteRole(roleId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: roleId });
    return result.deletedCount > 0;
  }

  static async updateRole(roleId: string, updates: Partial<Omit<Role, '_id' | 'createdAt'>>): Promise<Role | null> {
    const collection = await this.getCollection();
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    const result = await collection.findOneAndUpdate(
      { _id: roleId },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) return null;

    return {
      ...result,
      _id: result._id?.toString()
    };
  }

  static async getRoleForBalance(balance: number): Promise<Role[]> {
    const collection = await this.getCollection();
    
    // Only return roles if balance > 0
    if (balance <= 0) {
      return [];
    }
    
    // Get all holder roles (no amount threshold) and amount roles where balance meets threshold
    const roles = await collection.find({
      $or: [
        { type: 'holder' },
        { type: 'amount', amountThreshold: { $lte: balance } }
      ]
    }).toArray();

    return roles.map(role => ({
      ...role,
      _id: role._id?.toString()
    }));
  }
}