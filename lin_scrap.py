from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import time
import pickle

class LinkedInScraper:
    def __init__(self, driver_path):
        self.driver = webdriver.Chrome()


    def save_cookies(self, filepath):
        with open(filepath, 'wb') as filehandler:
            pickle.dump(self.driver.get_cookies(), filehandler)


    def load_cookies(self, filepath):
        with open(filepath, 'rb') as cookiesfile:
            cookies = pickle.load(cookiesfile)
            for cookie in cookies:
                self.driver.add_cookie(cookie)

    def scrape_current_job(self, profile_url):

        

        self.driver.get("https://www.linkedin.com")

        WebDriverWait(self.driver, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "main"))
    )
        
        self.load_cookies('linkedin_cookies.pkl')
        self.driver.get(profile_url)
        # Add code here to scrape the current job
        # ...
        #url = os.path.join(profile_url, "details/experience")
        #self.driver.get(url)
        #self.focus()
      
        #
        # Wait for the experience section to load
        WebDriverWait(self.driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "pvs-list__outer-container"))
        )
        wait = WebDriverWait(self.driver, 10)
        main_list = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "pvs-list")))
        li_elements = main_list.find_element(By.TAG_NAME, "li")
        #print(li_elements.get_attribute('outerHTML'))
        current_company = li_elements.find_element(By.XPATH, ".//div[contains(@class, 'display-flex')]/a//span")
        ##if there's no link attached to the company there will be issues here
        print(current_company.text)
        inner_list = main_list.find_element(By.CLASS_NAME,"pvs-list")
        #print("HEREEEEE" + inner_list.get_attribute('outerHTML'))
        current_job_elem = inner_list.find_element(By.XPATH,"li")
        #print("FINALLY" + current_job_elem.get_attribute('outerHTML'))
        job_title_element = current_job_elem.find_elements(By.XPATH, ".//span")
        current_job_title = current_job_elem.find_element(By.XPATH, ".//div[contains(@class, 'hoverable-link-text') and contains(@class, 't-bold')]/span")
        print(current_job_title.text)
        #for spans in job_title_element:
            #print(spans.get_attribute('outerHTML'))

        #job_title = job_title_element.text
        #At this point we have the list we want with the job title etc.
        #get the firt element and find the text
        
        #first_li = wait.until(EC.presence_of_element_located((By.XPATH, "//ul[contains(@class, 'pvs-list')]/li[1]")))

        #print(first_li.get_attribute('outerHTML'))

        #for position in main_list.find_elements(By.XPATH,"li"):
            #position = position.find_element(By.CLASS_NAME,"pvs-entity")
            #print(position.get_attribute('outerHTML'))

        if main_list:
            current_job_elem = main_list[0]  # The first element is the most recent job
            position_title = current_job_elem.find_element(By.TAG_NAME, "h3").text
            company_name = current_job_elem.find_element(By.XPATH, ".//p[1]").text
            print(f"Current Job Title: {position_title}")
            print(f"Company: {company_name}")
        else:
            print("No experience information found.")


    def login(self, username, password):
        self.driver.get("https://www.linkedin.com/login")

        # Find the username field and send the username
        username_field = self.driver.find_element(By.ID, "username")
        username_field.send_keys(username)

        # Find the password field and send the password
        password_field = self.driver.find_element(By.ID, "password")
        password_field.send_keys(password)

        # Find and click the login button
        login_button = self.driver.find_element(By.XPATH, "//button[@type='submit']")
        login_button.click()

        time.sleep(60)


    def close(self):
        self.driver.quit()

# Example usage
if __name__ == "__main__":
    scraper = LinkedInScraper(driver_path='chromedriver')


    #scraper.login("storemycourse1@gmail.com", "storemycourse")
    #scraper.save_cookies('linkedin_cookies.pkl')
    scraper.scrape_current_job('https://www.linkedin.com/in/pritak-patel-6032141b/')
    scraper.close()
