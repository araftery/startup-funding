# Data Specification


## Financial Orgs
* Array of financial org objects, each in the following form:

| Key        | Description | Sample Value |
|:----------:|:-----------:|:------------:|
| name | Proper name of the financial organization. | `Accel Partners`
| total_invested | Total capital invested. Note: this is just a sum of the amounts of *all* rounds the firm was involved in. So, this is a **very** inflated estimate (particularly for firms involved in later-stage investing). | `9428541785`
| num_companies | Integer value, total number of companies invested in. | `301`

### Example JSON

    {
        "name": "Accel Partners", 
        "total_invested": 9428541785, 
        "num_companies": 301
    }

## Industries
* Array of industry objects, which hold arrays of company objects, each in the following form:

## Industries, industry objects

### Industries, industry objects
| Key        | Description | Sample Value |
|:----------:|:-----------:|:------------:|
| name    | Industry name | `network_hosting`   
| children     | Array of company objects (see below) | (see below)


### Industries, company objects

| Key        | Description | Sample Value |
|:----------:|:-----------:|:------------:|
| name | Company proper name | `Dropbox`
| permalink | Company permalink, for lookup in other data, or from the Crunchbase API (sometimes this is different altogether from the plaintext name) | `dropbox`
| founded | Integer value, year founded, may be `null`. | `2007`
| industry | Industry category | `network_hosting`
| tags | Comma-delimited list of tags describing the company. May be `null`. | techcrunch50, tc50, file-storage
| overview | Description of the company. May be `null`. | Dropbox was founded in 2007 by Drew Houston and Arash Ferdowsi. Frustrated by working from multiple computers, Drew was inspired to create a service  [...]
| city | City the company is located in. May be `null`. | San Francisco
| state | State the company is located in (US postal code). May be `null`. | CA
| country | Country the company is located in (abbreviation). May be `null`. | USA
| twitter_handle | Company's Twitter handle. May be `null`. | Dropbox
| crunchbase_url | URL to the company's Crunchbase profile. | http://www.crunchbase.com/company/dropbox
| url | URL to the company's website. May be `null`. | http://www.dropbox.com/
| image_url | URL to the company's logo. May be `null`. | http://www.crunchbase.com/assets/images/resized/0001/1969/11969v19-max-450x450.png
| people | List of founders, co-founders, CEOs, etc. Array of `person` objects, which have two attributes, name and title. May be `null`. | 
| employees | Integer value, number of employees. May be `null`. | `642`
| total_raised | Integer value, total amount raised (sum of all rounds) | `607200000`
| children     | Array of round objects, ordered by date (see below) | (see below)


### Industries, round objects

| Key | Description | Sample Value |
|:---:|:-----------:|:------------:|
| date | Date of the round as a string in form MM/DD/YY | `02/05/13`
| amount | Integer value, total raised in the round (by all investors). May be `null`. | `2500000`
| currency | Currency used in the `amount` value. Almost always USD. | `USD`
| round_code | Type of round as a string. | `seed`
| investors | Array of investor names (strings) that were involved in the round. These are their proper names, not permalinks. | `['Accel Partners',]`    


### Example JSON

    {
        "name": "network_hosting",
        "children": [
            {
                "children": [
	                	{
	                        "amount": 1200000,
	                        "currency": "USD",
	                        "date": "09/04/08",
	                        "investors": [
                            	"Sequoia Capital"
                        	],
                        	"name": "seed"
                    	},
                    ],
                "city": "San Francisco",
                "company_permalink": "dropbox",
                "country": "USA",
                "crunchbase_url": "http://www.crunchbase.com/company/dropbox",
                "employees": 642,
                "image_url": "http://www.crunchbase.com/assets/images/resized/0001/1969/11969v19-max-450x450.png",
                "industry": "network_hosting",
                "investors": [
                    "T. Rowe Price",
                    "Greylock Partners",
                    "Institutional Venture Partners",
                    "Goldman Sachs",
                    "Sequoia Capital",
                    "Valiant Capital Partners",
                    "Glynn Capital Management",
                    "Index Ventures",
                    "Accel Partners",
                    "RIT Capital Partners",
                    "BlackRock",
                    "SV Angel",
                    "Benchmark"
                ],
                "name": "Dropbox",
                "overview": "Dropbox was founded in 2007 by Drew Houston and Arash Ferdowsi. Frustrated by working from multiple computers, Drew was inspired to create a service that would let people bring all their files anywhere, with no need to email around attachments. Drew created a demo of Dropbox and showed it to fellow MIT student Arash Ferdowsi, who dropped out with only one semester left to help make Dropbox a reality. Guiding their decisions was a relentless focus on crafting a simple and reliable experience across every computer and phone. Drew and Arash moved to San Francisco in fall 2007, secured seed funding from Y Combinator, and set about building a world-class engineering team. In fall 2008, Sequoia Capital led a $7.2M Series A with Accel Partners to help bring Dropbox to people everywhere.",
                "people": [
                    {
                        "name": "Drew Houston",
                        "title": "Founder & CEO"
                    },
                    {
                        "name": "Arash Ferdowsi",
                        "title": "Founder & CTO"
                    }
                ],
                "state": "CA",
                "tags": "techcrunch50, tc50, file-storage",
                "total_raised": 607200000,
                "twitter_handle": "Dropbox",
                "url": "http://www.dropbox.com"
            }
        ]
    }