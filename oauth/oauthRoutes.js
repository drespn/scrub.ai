const express = require('express');
const router = express.Router();
const salesforceOAuth = require('./salesforceOAuth');

router.get('/auth/salesforce', salesforceOAuth.redirectToSalesforce);
router.get('/auth/salesforce/callback', salesforceOAuth.handleCallback);

module.exports = router;
