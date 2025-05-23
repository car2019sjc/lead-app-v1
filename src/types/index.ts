export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  company: string;
  location: string;
  industry: string;
  email: string | null;
  profileUrl: string;
  emailVerified: boolean;
  emailScore: number | null;
  employeeCount: string;
  validationResult?: {
    status: string;
    score: number;
    [key: string]: any;
  } | null;
  workHistory?: Array<{
    title: string;
    company: string;
    companyUrl?: string;
    duration: string;
    description?: string;
    skills?: string[];
    location?: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    fieldOfStudy?: string;
    year?: string;
    activities?: string;
  }>;
  skills?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date?: string;
    description?: string;
  }>;
}

export interface SearchParams {
  jobTitle: string;
  location: string;
  industry: string;
  count: number;
}

export interface Notification {
  show: boolean;
  message: string;
  type: 'success' | 'warning' | 'error' | '';
}