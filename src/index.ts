import awsLambdaFastify from '@fastify/aws-lambda';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import fastify from 'fastify';
import { prismaClient } from './client';

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
    const { name = null, email } = req.body;

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
        'x-user-id': Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { 'x-user-id': userId } = req.headers;
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
  '/post/:id/views',
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    const post = await prismaClient.post.update({
      where: { id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    res.send(post);
  }
);

app.put(
  '/publish/:id',
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    const updatedPost = await prismaClient.post.update({
      where: { id },
      data: { published: true },
    });

    res.send(updatedPost);
  }
);

app.delete(
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

app.get(
  '/users',
  {
    schema: {
      headers: Type.Object({
        'x-user-id': Type.Number(),
      }),
      response: {
        200: Type.Object({
          users: Type.Array(
            Type.Object({
              id: Type.Number(),
              contactInfo: Type.Object({
                email: Type.String(),
              }),
            })
          ),
        }),
      },
    },
  },
  async (req, res) => {
    const currentUser = await prismaClient.user.findUniqueOrThrow({
      where: { id: req.headers['x-user-id'] },
    });

    const users = await prismaClient.user.findMany({
      // only include emails in responses to administrators
      select: { id: true, email: currentUser.isAdmin },
    });

    const transformedUserList = users.map(({ id, email }) => {
      return { id, contactInfo: { email } };
    });

    req.log.info({ transformedUserList }, 'Responding with user list');

    // should not be allowed
    res.send({ users: transformedUserList });
    // we can end up with something that looks like this, which is invalid
    // res.send({ users: [{id: 1, contactInfo: { email: undefined}}] });
  }
);

app.get(
  '/user/:id',
  {
    schema: {
      params: Type.Object({
        id: Type.Number(),
      }),
      querystring: Type.Object({
        includePosts: Type.Boolean({ default: false }),
      }),
    },
  },
  async (req, res) => {
    const { id } = req.params;

    const user = await prismaClient.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        // optionally include the user's posts
        // avoids querying extra data if it's not needed
        posts: req.query.includePosts,
      },
    });

    // this should not be allowed, `user.posts` might be undefined
    req.log.info('Found user %s with %s posts', id, user.posts.length);

    res.send(user);
  }
);

app.get(
  '/user/:id/drafts',
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

app.get(
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

export const handler = awsLambdaFastify(app, {
  serializeLambdaArguments: false,
});
