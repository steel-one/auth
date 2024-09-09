import { User } from '@prisma/client';

export class ManyAndCountResponse {
  nodes: User[];

  total: number;
}
