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
      //process the leads and get the stats
      const { misalignmentsCount, updatedLeadsCount, misalignmentsLog, misalignmentsByAccountArray } = await processLeads(salesforceId, reportId);
      //create a single object to send back to the client
      const responseObject = {
        instanceUrlObject,
        stats: {
          misalignmentsCount,
          updatedLeadsCount,
          misalignmentsLog,
          misalignmentsByAccountArray
        }
      };
      res.json(responseObject);
    } catch (error) {
      console.error('Error processing report:', error);
      res.status(500).send('Failed to process report');
    }
  });

module.exports = router;
