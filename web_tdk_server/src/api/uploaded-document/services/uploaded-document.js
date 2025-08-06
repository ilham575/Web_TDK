'use strict';

/**
 * uploaded-document service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::uploaded-document.uploaded-document');
