import { DataSource } from 'typeorm';
import { UserConnection } from './src/users/entities/user-connection.entity';
import { User } from './src/users/entities/user.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [UserConnection, User]
});

async function run() {
  await ds.initialize();
  const connections = await ds.getRepository(UserConnection).find({ relations: ['connector', 'target'] });
  console.log("Total connections:", connections.length);
  for (let c of connections) {
      console.log(`Connector: ${c.connector?.email} Target: ${c.target?.email}`);
  }
  await ds.destroy();
}
run();
