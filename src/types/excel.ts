export interface ExcelLead {
  'First Name': string;
  'Last Name': string;
  'Title': string;
  'Company': string;
  'Company Name for Emails': string;
  'Email': string;
  '# Employees': string;
  'Industry': string;
  'Person Linkedin Url': string;
  'City': string;
  'State': string;
}

export interface SearchResult {
  id: string;
  name: string;
  jobTitle: string;
  company: string;
  industry: string;
  ftes: string;
  location: string;
  profileUrl: string;
  email: string;
}

export interface SearchParams {
  jobTitle: string;
  location: string;
  industry: string;
  count: number;
}