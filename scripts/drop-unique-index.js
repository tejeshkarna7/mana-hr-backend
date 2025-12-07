import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

async function dropUniqueIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/manahr');
    console.log('Connected to MongoDB');

    // Get the attendance collection
    const db = mongoose.connection.db;
    const collection = db.collection('attendances');

    // Get existing indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop the unique index if it exists
    try {
      await collection.dropIndex({ employeeId: 1, date: 1 });
      console.log('Successfully dropped unique index on employeeId_1_date_1');
    } catch (error) {
      if (error.message.includes('index not found')) {
        console.log('Unique index not found - may have already been dropped');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }

    // Recreate the index without unique constraint
    await collection.createIndex({ employeeId: 1, date: 1 });
    console.log('Successfully recreated index without unique constraint');

    // Get updated indexes
    const updatedIndexes = await collection.indexes();
    console.log('Updated indexes:', JSON.stringify(updatedIndexes, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

dropUniqueIndex();