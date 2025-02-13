/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { defineBulkGetUserProfilesRoute } from './bulk_get';
import { defineGetUserProfileRoute } from './get';
import { defineUpdateUserProfileDataRoute } from './update';

export function defineUserProfileRoutes(params: RouteDefinitionParams) {
  defineUpdateUserProfileDataRoute(params);
  defineGetUserProfileRoute(params);
  defineBulkGetUserProfilesRoute(params);
}
