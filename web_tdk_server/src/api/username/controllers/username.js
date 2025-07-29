'use strict';

/**
 * username controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::username.username');
