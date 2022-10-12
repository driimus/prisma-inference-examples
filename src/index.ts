import { Prisma } from "@prisma/client";
import awsLambdaFastify from "@fastify/aws-lambda";
import fastify, {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyTypeProviderDefault,
  RawServerDefault,
  RouteHandlerMethod,
} from "fastify";
import { prismaClient } from "./client";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { IncomingMessage, ServerResponse } from "http";
import { Server } from "node:https";
import { ResolveFastifyRequestType } from "fastify/types/type-provider";

export const app = fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

app.post(
  `/signup`,
  {
    schema: {
      body: Type.Object({
        name: Type.Optional(Type.String()),
        email: Type.String(),
      }),
    },
  },
  async (req, res) => {
    const { name, email } = req.body;

    const result = await prismaClient.user.create({
      data: {
        name,
        email,
      },
    });

    res.send(result);
  }
);

app.post(
  `/post`,
  {
    schema: {
      body: Type.Object({
        title: Type.String({ minLength: 3 }),
        content: Type.String(),
      }),
      headers: Type.Object({
        "x-user-id": Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { "x-user-id": userId } = req.headers;
    const { title, content } = req.body;

    const result = await prismaClient.post.create({
      data: {
        title,
        content,
        author: { connect: { id: userId } },
      },
    });

    res.send(result);
  }
);

app.put(
  "/post/:id/views",
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    try {
      const post = await prismaClient.post.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      res.send(post);
    } catch (error) {
      res.send({ error: `Post with ID ${id} does not exist in the database` });
    }
  }
);

app.put(
  "/publish/:id",
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    try {
      const updatedPost = await prismaClient.post.update({
        where: { id },
        data: { published: true },
      });
      res.send(updatedPost);
    } catch (error) {
      res.send({ error: `Post with ID ${id} does not exist in the database` });
    }
  }
);

app.delete<{
  Params: IPostByIdParam;
}>(
  `/post/:id`,
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;
    const post = await prismaClient.post.delete({
      where: {
        id,
      },
    });
    res.send(post);
  }
);

app.get("/users", async (req, res) => {
  const users = await prismaClient.user.findMany();
  res.send(users);
});

app.get<{
  Params: IPostByIdParam;
}>(
  "/user/:id/drafts",
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    const drafts = await prismaClient.user
      .findUnique({
        where: { id },
      })
      .posts({
        where: { published: false },
      });

    res.send(drafts);
  }
);

app.get<{
  Params: IPostByIdParam;
}>(
  `/post/:id`,
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    const post = await prismaClient.post.findUnique({
      where: { id },
    });
    res.send(post);
  }
);

app.get<{
  Params: IPostByIdParam;
}>(
  `/post/:id`,
  {
    schema: {
      body: "not valid",
    },
  },
  async (req, res) => {
    const { id } = req.params;
    req.body;
    const post = await prismaClient.post.findUnique({
      where: { id },
    });
    res.send(post);
  }
);
// app.get<{
//   Querystring: IFeedQueryString;
// }>("/feed", async (req, res) => {
//   const { searchString, skip, take, orderBy } = req?.query;

//   const or: Prisma.ReviewWhereInput = searchString
//     ? {
//         OR: [
//           { rating: { equals: Number(searchString) || undefined } },
//           { content: { contains: searchString as string } },
//         ],
//       }
//     : {};

//   const posts = await prismaClient.review.findMany({
//     where: {
//       published: true,
//       ...or,
//     },
//     include: { author: true },
//     take: Number(take) || undefined,
//     skip: Number(skip) || undefined,
//   });

//   res.send(posts);
// });

interface IFeedQueryString {
  searchString: string | null;
  skip: number | null;
  take: number | null;
  orderBy: Prisma.SortOrder | null;
}

interface IPostByIdParam {
  id: number;
}

// app.listen(3000, (err) => {
//   if (err) {
//     console.error(err)
//     process.exit(1)
//   }
//   console.log(`
//   🚀 Server ready at: http://localhost:3000
//   ⭐️ See sample requests: http://pris.ly/e/ts/rest-fastify#3-using-the-rest-api`)
// })

type Test = typeof app extends FastifyInstance ? true : false;
type Test2 = FastifyTypeProviderDefault extends TypeBoxTypeProvider
  ? true
  : false;
type Tested<T extends FastifyInstance> = { app: T };

type Assigning = RouteHandlerMethod<
  RawServerDefault,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  any,
  any,
  any,
  TypeBoxTypeProvider,
  FastifyBaseLogger
>;

type AssignedTo = RouteHandlerMethod<
  RawServerDefault,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  any,
  any,
  any,
  FastifyTypeProviderDefault,
  FastifyBaseLogger
>;

type Tester = Parameters<Assigning> extends Parameters<AssignedTo>
  ? true
  : false;

type One = (
  arg1: ResolveFastifyRequestType<FastifyTypeProviderDefault, any, any>
) => void;
type Two = (
  arg1: ResolveFastifyRequestType<TypeBoxTypeProvider, any, any>
) => void;

type First = ResolveFastifyRequestType<FastifyTypeProviderDefault, any, any>;
type Second = ResolveFastifyRequestType<TypeBoxTypeProvider, any, any>;

// type AssignToThis<T extends
type Tested22 = Two extends One ? true : false;
type TestType<T extends One> = T;
type R = TestType<Two>;
export const handler = awsLambdaFastify(app, {
  serializeLambdaArguments: false,
});
