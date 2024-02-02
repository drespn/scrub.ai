require('dotenv').config();
const { exec } = require('child_process');

//access credentials
const SF_USERNAME = process.env.SF_USERNAME;
const SF_PASSWORD = process.env.SF_PASSWORD;
const SF_CLIENT_ID = process.env.SF_CLIENT_ID;
const SF_URL = process.env.SF_URL;
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;



const jsforce = require('jsforce');
const axios = require('axios');
const { getToken } = require('./tokenService'); // Adjust the path as needed



let sfConn = null; // Global Salesforce connection object

async function initSalesforceConnection(salesforceId) {
  const credentials = await getToken(salesforceId);
  if (!credentials) {
    throw new Error('No credentials found for the provided Salesforce ID');
  }

  const { accessToken, instanceUrl } = credentials;
  sfConn = new jsforce.Connection({
    instanceUrl: instanceUrl,
    accessToken: accessToken
  });

  return {instanceUrl};
}



//const reportId = '00OHn000008fWQzMAM'; // Replace with the reportId from your data

async function fetchSalesforceReportRows(salesforceId, reportId) {
  // Log into Salesforce
  /*const credentials = await getToken(salesforceId);
  if (!credentials) {
    throw new Error('No credentials found for the provided Salesforce ID');
  }

  const { accessToken, instanceUrl } = credentials;
  const conn = new jsforce.Connection({
    instanceUrl: instanceUrl,
    accessToken: accessToken
  });*/

  if (!sfConn) {
    await initSalesforceConnection(salesforceId);
  }


  const report = await sfConn.request(`/services/data/v35.0/analytics/reports/${reportId}?includeDetails=true`);

  // Extract rows data
  const rowsData = report.factMap["T!T"].rows;
  const columnInfo = report.reportExtendedMetadata.detailColumnInfo;

  // Extract column titles
  const columnTitles = Object.keys(columnInfo);

/*rowsData.forEach((row, index) => {
  console.log(`Row ${index}:`, row);
});*/

// Log each row with associated column titles
/*rowsData.forEach((row, index) => {
    const rowDataWithTitles = {};

    row.dataCells.forEach((cell, cellIndex) => {
        const title = columnTitles[cellIndex];
        rowDataWithTitles[title] = cell.label;
    });

    console.log(`▼Row ${index + 1} Data▼:`, JSON.stringify(rowDataWithTitles, null, 2));
});*/
//mapping the 2D report into each lead with this function
  const leads = rowsData.map(row => {
    const lead = {};
    const leadId = row.dataCells[0].value;
    
    row.dataCells.forEach((cell, cellIndex) => {
      const title = columnTitles[cellIndex];
      lead[title] = cell.label;
    });
    //manually adding this field
    lead['salesforceId'] = leadId;
    return lead;
  });

  return leads;


  // Return the rows data for further processing or use
  //return rowsData;

  /*return new Promise((resolve, reject) => {
    conn.request(reportRowsEndpoint, function(error, reportDetailsData) {
      if (error) {
        reject(error);
      } else {
        resolve(reportDetailsData);
      }
    });
  });*/
}

async function findLinkedInProfile(lead, searchResults) {
  // Filter for LinkedIn URLs
  const linkedInResults = searchResults.filter(result =>
    result.link.includes('linkedin.com/in')
  );

  // If no LinkedIn URLs are found, return null
  if (linkedInResults.length > 0) {
    // Access the link of the first (and presumably only) result
    const linkedInUrl = linkedInResults[0].link;
    //console.log(`LinkedIn URL for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${linkedInUrl}`);
    return linkedInUrl;
  } else {
    console.log(`No LinkedIn profile found for ${lead.FIRST_NAME} ${lead.LAST_NAME}`);
    return null;
  }

  /*if (linkedInResults.length === 0) {
    console.log(`No LinkedIn profile found for ${lead.FIRST_NAME} ${lead.LAST_NAME}`);
    return null; // Or handle this case as needed
  }*/

  // Heuristic: Find a profile matching the company name
  /*const matchedProfile = linkedInResults.find(result =>
    result.snippet.includes(lead.COMPANY)
  );*/

  /*if (linkedInResults) {
    return linkedInResults.link;
  } else {
    console.log(`Uncertain match for ${lead.FIRST_NAME} ${lead.LAST_NAME}, manual review needed`);
    return null; // Or handle this case as needed
  }*/
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function updateSalesforceLead(leadId, newCompanyName, newPositionTitle) {

  if (!sfConn) {
    throw new Error('Salesforce connection not initialized');
  }

  try {
    const updateData = {
      Company: newCompanyName,
      Title: newPositionTitle
    };

    const updateEndpoint = `/services/data/v35.0/sobjects/Lead/${leadId}`;

    await sfConn.request({
      method: 'PATCH',
      url: updateEndpoint,
      body: JSON.stringify(updateData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Lead with ID ${leadId} updated successfully.`);
  } catch (error) {
    console.error(`Error updating lead with ID ${leadId}:`, error);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//google search implementation
async function googleSearch(query) {
  const endpoint = `https://www.googleapis.com/customsearch/v1?q=${query}&key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_ID}`;

  try {
      const response = await axios.get(endpoint);
      //console.log(response.data.items);
      return response.data.items;  // This will return search results
  } catch (error) {
      console.error("Error with Google Search:", error);
      return null;
  }
}

// Example Usage:
// Assuming you've fetched a Salesforce lead with the fields: firstName, lastName, and company
/*const lead = {
  firstName: "Diego",
  lastName: "Espinosa",
  company: "Duke University"
};

const query = `${lead.firstName} ${lead.lastName} ${lead.company}`;
googleSearch(query).then(results => {
  // Check results and see if they match LinkedIn profiles.
  // ... further processing ...
});*/
function scrapeLinkedInProfile(linkedInUrls) {
  return new Promise((resolve, reject) => {

    //const urlsString = linkedInUrls.join(' ');
    const command = `python3 lin_scraper.py ${linkedInUrls.join(' ')}`;
    //console.log(command);
    

    exec(command, (error, stdout, stderr) => {


      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }
      //resolve(stdout.trim());
      try {
        const scrapedData = JSON.parse(stdout);
        resolve(scrapedData);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

async function compareLeadOwnerToTDR(company, ownerName) {
  let accountInfo, userInfo, tdrUserInfo;

  try {
    // Use the Salesforce API to search for the account info related to the COMPANY
    accountInfo = await sfConn.sobject("Account").find({ 'Name': company });
  } catch (error) {
    console.error(`Error fetching account info for company: ${company}`, error);
    return null;
  }

  // If no account is found, return null
  if (accountInfo.length === 0) {
    console.error(`No account found for company: ${company}`);
    return null;
  }

  try {
    // Use the Salesforce API to find the user ID associated with the ownerName
    userInfo = await sfConn.sobject("User").find({ 'Name': ownerName });
  } catch (error) {
    console.error(`Error fetching user info for owner name: ${ownerName}`, error);
    return null;
  }

  // If no user is found, return null
  if (userInfo.length === 0) {
    console.error(`No user found for owner name: ${ownerName}`);
    return null;
  }

  // Compare the OWNER field to the TDR field tied to the Account object
  const account = accountInfo[0];
  const ownerId = userInfo[0].Id;
  const tdr = account.TDR__c;

  if (ownerId === tdr) {
    return null;
  } else {
    try {
      // If OWNER and TDR do not match, find the TDR user's name
      tdrUserInfo = await sfConn.sobject("User").find({ 'Id': tdr });
    } catch (error) {
      console.error(`Error fetching TDR user info for ID: ${tdr}`, error);
      return null;
    }
    return { tdrId: tdr, tdrName: tdrUserInfo[0].Name };
  }
}



async function processLeads(salesforceId, reportId) {
  const leads = await fetchSalesforceReportRows(salesforceId,reportId);

  const linkedInUrls = await Promise.all(leads.map(async (lead) => {
    const query = `${lead.FIRST_NAME} ${lead.LAST_NAME} ${lead.COMPANY} LinkedIn`;
    const searchResults = await googleSearch(query);
    return await findLinkedInProfile(lead, searchResults);
  }));

  // Filter out null or undefined URLs
  const validLinkedInUrls = linkedInUrls.filter(url => url);
  const scrapedDataArray = await scrapeLinkedInProfile(validLinkedInUrls);

  //stats object initialization
  let updatedLeadsCount = 0;
  let misalignmentsCount = 0;
  let misalignmentsLog = [];
  let misalignmentsByAccount = {};




  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const scrapedData = scrapedDataArray[i];

    const tdrInfo = await compareLeadOwnerToTDR(lead.COMPANY, lead.OWNER);
  
    // If OWNER and TDR do not match, update the lead's owner to the TDR user, and print a message with the changes
    if (tdrInfo) {
      await sfConn.sobject("Lead").update({ Id: lead.salesforceId, OwnerId: tdrInfo.tdrId });

      //update stats
      misalignmentsCount++;
      misalignmentsLog.push(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} updated to TDR user ${tdrInfo.tdrName}.`);

        if (misalignmentsByAccount[lead.COMPANY]) {
          misalignmentsByAccount[lead.COMPANY]++;
        } else {
          misalignmentsByAccount[lead.COMPANY] = 1;
        }
      
    }


    if (scrapedData && (scrapedData.company !== lead.COMPANY || scrapedData.position_title !== lead.TITLE)) {
      await updateSalesforceLead(lead.salesforceId, scrapedData.company, scrapedData.position_title);
      updatedLeadsCount++;
      console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} updated.`);
    } else {
      console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} is already up to date.`);
    }
  }

  /*for (const lead of leads) {
    // Construct the query using lead's first name, last name, and company
    const query = `${lead.FIRST_NAME} ${lead.LAST_NAME} ${lead.COMPANY}`;
    const searchResults = await googleSearch(query);

    const linkedInProfileUrl = await findLinkedInProfile(lead, searchResults);
    if (linkedInProfileUrl) {
      console.log(`LinkedIn URL for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${linkedInProfileUrl}`);
      const scrapedData = await scrapeLinkedInProfile(linkedInProfileUrl);
      console.log(`Scraped Data for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${scrapedData}`);
      // Process the scraped data as needed

      try {
        const scrapedData = await scrapeLinkedInProfile(linkedInProfileUrl);

        // Compare scraped data with current lead data
        if (scrapedData.company !== lead.COMPANY || scrapedData.position_title !== lead.TITLE) {
          // Update the lead in Salesforce
          await updateSalesforceLead(lead.salesforceId, scrapedData.company, scrapedData.position_title);
          console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} updated.`);
        } else {
          console.log(`Lead ${lead.FIRST_NAME} ${lead.LAST_NAME} with ID ${lead.salesforceId} is already up to date.`);
        }

        console.log(`Company for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${scrapedData.company}`);
        console.log(`Position Title for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${scrapedData.position_title}`);
        // Use scrapedData.company and scrapedData.position_title as needed
      } catch (error) {
        console.error(`Error scraping LinkedIn profile for ${lead.FIRST_NAME} ${lead.LAST_NAME}: ${error}`);
      }
    }
    // Process the search results
    //console.log(`Results for ${lead.FIRST_NAME} ${lead.LAST_NAME}:`, searchResults);

    // Here you can add logic to update Salesforce or perform other actions
  }*/

  let misalignmentsByAccountArray = Object.entries(misalignmentsByAccount);
  misalignmentsByAccountArray.sort((a, b) => b[1] - a[1]);
  console.log(misalignmentsByAccountArray);

  return { updatedLeadsCount, misalignmentsCount, misalignmentsLog, misalignmentsByAccountArray};
}

//processLeads();
//updateSalesforceLead("00QHp00001U7vhhMAB","Hi","Bye")
//fetchSalesforceReportRows();
//test report ID: 00OHn000008fWQzMAM

module.exports = {
  processLeads,
  initSalesforceConnection
};