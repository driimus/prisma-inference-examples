import { faker } from '@faker-js/faker';
import { prismaClient } from '../src/client';
import { Factory } from 'fishery';
import { Prisma, User } from '@prisma/client';
import { handler } from '../src';

const userFactory = Factory.define<Prisma.UserCreateInput, never, User>(({ onCreate }) => {
  onCreate((data) => prismaClient.user.create({ data }));

  return {
    email: faker.internet.email(),
    isAdmin: faker.datatype.boolean(),
  };
});

let users: User[];

beforeEach(async () => {
  await prismaClient.user.deleteMany();
  users = await userFactory.createList(3);
});

afterAll(async () => {
  await prismaClient.$disconnect();
});

describe('the api', () => {
  it.each([true, false])(
    'should fetch an user when includePosts is set to %s',
    async (includePosts) => {
      await expect(
        handler(
          {
            httpMethod: 'GET',
            path: `/user/${users[0]?.id}`,
            headers: {
              'Content-Type': 'application/json',
            },
            queryStringParameters: {
              includePosts,
            },
          },
          {} as any
        )
      ).resolves.toMatchObject({
        statusCode: 200,
      });
    }
  );

  describe('should not reject request to retrieve all users', () => {
    it('made by an admin', async () => {
      const admin = await userFactory.create({ isAdmin: true });
      await expect(
        handler(
          {
            httpMethod: 'GET',
            path: '/users',
            headers: {
              'x-user-id': admin.id,
              'Content-Type': 'application/json',
            },
          },
          {} as any
        )
      ).resolves.toMatchObject({
        statusCode: 200,
      });
    });

    it('made by a normal user', async () => {
      const user = await userFactory.create({ isAdmin: false });
      await expect(
        handler(
          {
            httpMethod: 'GET',
            path: '/users',
            headers: {
              'x-user-id': user.id,
              'Content-Type': 'application/json',
            },
          },
          {} as any
        )
      ).resolves.toMatchObject({
        statusCode: 200,
      });
    });
  });
});
