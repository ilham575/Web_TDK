'use strict';

/**
 * username service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::username.username');
