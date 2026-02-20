import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { log } from './logger.js';

export async function registerSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'AI Support Widget API',
        description: 'API for the AI Support Widget — embeddable AI support for SaaS apps.',
        version: '0.1.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local development' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT signed by the host application',
          },
          adminAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Admin API key',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Health check endpoint' },
        { name: 'Cases', description: 'Support case management' },
        { name: 'Admin', description: 'Tenant and analytics management' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      defaultModelRendering: 'model',
    },
    theme: { title: 'AI Support Widget API Docs' },
  });

  log.info('Swagger UI registered at /api/docs');
}
