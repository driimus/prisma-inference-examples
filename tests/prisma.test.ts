// import { PrismaClient } from "@prisma/client";

import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { prismaClient } from "../src/client";

beforeAll(async () => {
  await prismaClient.user.create({ data: { email: faker.internet.email() } });
});

afterAll(async () => {
  await prismaClient.user.deleteMany();
  await prismaClient.$disconnect();
});

describe("prisma", () => {
  it.each([true, false])(
    "should mark filtered fields as optional when evaluating $posts",
    async (posts) => {
      const user = await prismaClient.user.findFirstOrThrow({
        select: {
          id: true,
          posts,
        },
      });

      expect(() => user.posts.length).not.toThrowError();
    }
  );

  it("should not mark posts as required", async () => {
    const user = await prismaClient.user.findFirstOrThrow({
      select: {
        id: true,
        posts: true,
      },
    });

    expect(user.posts.length).toBe(0);
  });

  it("should mark posts as undefined", async () => {
    const user = await prismaClient.user.findFirstOrThrow({
      select: {
        id: true,
        posts: false,
      },
    });

    // @ts-expect-error posts should be undefined
    expect(() => user.posts.length).toThrowError();
  });
});
