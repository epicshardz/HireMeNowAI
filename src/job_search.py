import sys
import json
from jobspy import scrape_jobs
from datetime import datetime, timedelta

def search_jobs(query, location, limit, days_old=14):
    try:
        # Calculate hours old from days
        hours_old = days_old * 24

        # Get jobs from JobSpy
        jobs_df = scrape_jobs(
            site_name=["indeed"],
            search_term=query,
            location=location,
            results_wanted=limit,
            sort_by="date",
            description_format="html",  # Get HTML formatted descriptions
            country_indeed='USA',  # Ensure we're searching in the USA
            hours_old=hours_old  # Filter by posting date
        )
        
        if jobs_df.empty:
            return []

        # Convert DataFrame to list of dictionaries
        jobs = []
        for _, job in jobs_df.iterrows():
            try:
                formatted_job = {
                    'jobId': str(job.get('id', '')),
                    'title': str(job.get('title', '')),
                    'company': str(job.get('company', '')),
                    'location': f"{job.get('city', '')}, {job.get('state', 'US')}".strip(', '),
                    'description': str(job.get('description', '')),
                    'url': str(job.get('job_url', '') or job.get('job_url_direct', '')),
                    'datePosted': str(job.get('date_posted', '')),
                    'salary': 'Not specified',
                    'jobType': str(job.get('job_type', 'Not specified')),
                    'matchScore': 0.0  # Initial score, will be updated by matchScorer
                }

                # Add salary if available
                if job.get('min_amount') or job.get('max_amount'):
                    if job.get('interval') == 'hourly':
                        if job.get('min_amount') and job.get('max_amount'):
                            formatted_job['salary'] = f"${job['min_amount']:.2f} - ${job['max_amount']:.2f} per hour"
                        elif job.get('min_amount'):
                            formatted_job['salary'] = f"${job['min_amount']:.2f} per hour"
                        elif job.get('max_amount'):
                            formatted_job['salary'] = f"${job['max_amount']:.2f} per hour"
                    else:  # yearly
                        if job.get('min_amount') and job.get('max_amount'):
                            formatted_job['salary'] = f"${int(job['min_amount']):,} - ${int(job['max_amount']):,} per year"
                        elif job.get('min_amount'):
                            formatted_job['salary'] = f"${int(job['min_amount']):,} per year"
                        elif job.get('max_amount'):
                            formatted_job['salary'] = f"${int(job['max_amount']):,} per year"

                # Add company info if available
                if any([job.get('company_industry'), job.get('company_employees_label'),
                       job.get('company_description'), job.get('company_logo')]):
                    formatted_job['companyInfo'] = {
                        'industry': str(job.get('company_industry', '')),
                        'size': str(job.get('company_employees_label', '')),
                        'description': str(job.get('company_description', '')),
                        'logo': str(job.get('company_logo', ''))
                    }

                jobs.append(formatted_job)
            except Exception as e:
                print(json.dumps({"warning": f"Error formatting job: {str(e)}"}), file=sys.stderr)
                continue

        return jobs

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)
    
    query = sys.argv[1]
    location = sys.argv[2]
    limit = int(sys.argv[3])
    days_old = int(sys.argv[4]) if len(sys.argv) > 4 else 14
    
    try:
        jobs = search_jobs(query, location, limit, days_old)
        print(json.dumps(jobs))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
