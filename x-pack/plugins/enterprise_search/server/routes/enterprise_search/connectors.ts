/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../../common/types/error_codes';
import { addConnector } from '../../lib/connectors/add_connector';
import { updateConnectorConfiguration } from '../../lib/connectors/update_connector_configuration';
import { updateConnectorScheduling } from '../../lib/connectors/update_connector_scheduling';

import { RouteDependencies } from '../../plugin';
import { createError } from '../../utils/create_error';

export function registerConnectorRoutes({ router }: RouteDependencies) {
  router.post(
    {
      path: '/internal/enterprise_search/connectors',
      validate: {
        body: schema.object({
          delete_existing_connector: schema.maybe(schema.boolean()),
          index_name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const body = await addConnector(client, request.body);
        return response.ok({ body });
      } catch (error) {
        if (error.statusCode === 403) {
          return createError({
            errorCode: ErrorCode.UNAUTHORIZED,
            message: i18n.translate(
              'xpack.enterpriseSearch.server.routes.addConnector.unauthorizedError',
              {
                defaultMessage: 'You do not have the correct access rights to create this resource',
              }
            ),
            response,
            statusCode: 403,
          });
        }
        if (
          (error as Error).message === ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS ||
          (error as Error).message === ErrorCode.INDEX_ALREADY_EXISTS
        ) {
          return createError({
            errorCode: (error as Error).message as ErrorCode,
            message: i18n.translate(
              'xpack.enterpriseSearch.server.routes.addConnector.connectorExistsError',
              {
                defaultMessage: 'Connector or index already exists',
              }
            ),
            response,
            statusCode: 409,
          });
        }
        return response.customError({
          body: i18n.translate('xpack.enterpriseSearch.server.routes.addConnector.error', {
            defaultMessage: 'Error fetching data from Enterprise Search',
          }),
          statusCode: 502,
        });
      }
    }
  );
  router.post(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/configuration',
      validate: {
        body: schema.recordOf(
          schema.string(),
          schema.object({ label: schema.string(), value: schema.string() })
        ),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        await updateConnectorConfiguration(client, request.params.connectorId, request.body);
        return response.ok();
      } catch (error) {
        return response.customError({
          body: i18n.translate('xpack.enterpriseSearch.server.routes.updateConnector.error', {
            defaultMessage: 'Error fetching data from Enterprise Search',
          }),
          statusCode: 502,
        });
      }
    }
  );
  router.post(
    {
      path: '/internal/enterprise_search/connectors/{connectorId}/scheduling',
      validate: {
        body: schema.object({ enabled: schema.boolean(), interval: schema.string() }),
        params: schema.object({
          connectorId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        await updateConnectorScheduling(client, request.params.connectorId, request.body);
        return response.ok();
      } catch (error) {
        return response.customError({
          body: i18n.translate('xpack.enterpriseSearch.server.routes.updateConnector.error', {
            defaultMessage: 'Error fetching data from Enterprise Search',
          }),
          statusCode: 502,
        });
      }
    }
  );
}
