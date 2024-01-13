# linkedin_scrape.py
import sys
import os

linkedin_scraper_12_path = '/Users/diegoespinosa/Desktop/icloud/linkedin_scraper_12'
sys.path.append(linkedin_scraper_12_path)

from linkedin_scraper2 import Person,actions
from selenium import webdriver
import json




def scrape_linkedin_profile(driver, url):
    #driver = webdriver.Chrome()
    #email = "storemycourse1@gmail.com"  # You can also use environment variables or input arguments
    #password = "storemycourse"
    #actions.login(driver, email, password)  # Login to LinkedIn


    person = Person(url, driver=driver)
    #person.scrape(close_on_complete=True)

    # Convert the scraped data to JSON and print it
    #print(person.company)
    #print(person.experiences[0].position_title.split('\n')[0])

    # Create a dictionary with the required data
    scraped_data = {
        "company": person.company,
        "position_title": person.experiences[0].position_title.split('\n')[0] if person.experiences else None
    }

    # Output the data as JSON
    return scraped_data

def main(urls):
    driver = webdriver.Chrome()
    email = "storemycourse1@gmail.com"
    password = "storemycourse"
    actions.login(driver, email, password)  # Login to LinkedIn only once


    all_scraped_data = []
    for url in urls:
        scraped_data = scrape_linkedin_profile(driver, url)
        all_scraped_data.append(scraped_data)

    print(json.dumps(all_scraped_data))  # Output all data as JSON
    driver.quit() 


if __name__ == "__main__":
    profile_urls = sys.argv[1:]  # Get all LinkedIn profile URLs from command line arguments
    main(profile_urls)
