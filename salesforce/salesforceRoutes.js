// salesforce/salesforceRoutes.js

const express = require('express');
const router = express.Router();
const { fetchReports } = require('./salesforceReports');
const {processLeads, initSalesforceConnection} = require('../salesforceIntegration');

router.get('/reports', async (req, res) => {
    try {
        const { salesforceId } = req.query; 
        const reports = await fetchReports(salesforceId);
        //console.log(reports);
        res.json(reports);
    } catch (error) {
        console.error('Error in /reports route:', error);
        res.status(500).send('Failed to fetch reports');
    }
});

router.post('/processReport', async (req, res) => {
    try {
      const { salesforceId, reportId } = req.body;

      //initialize the salesforce connection
      const instanceUrlObject = await initSalesforceConnection(salesforceId);
      //console.log(instanceUrlObject);
      const stats = await processLeads(salesforceId, reportId);
      res.json({stats, instanceUrlObject});
    } catch (error) {
      console.error('Error processing report:', error);
      res.status(500).send('Failed to process report');
    }
  });

module.exports = router;
