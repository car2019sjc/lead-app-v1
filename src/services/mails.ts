import axios from 'axios';
import config from '../config';

export interface ValidationResult {
  email: string;
  status: string;
  score: number;
  [key: string]: any;
}

export const validateEmails = async (emails: (string | null)[]): Promise<ValidationResult[]> => {
  try {
    // Remove null or empty values
    const validEmails = emails.filter(email => email && email.trim() !== '');
    
    if (validEmails.length === 0) {
      return [];
    }
    
    const response = await axios.post('/mails/v1/batch', {
      emails: validEmails
    }, {
      headers: {
        'x-mails-api-key': config.mailsApiKey,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.emails || [];
  } catch (error) {
    console.error('Error validating emails:', error);
    throw error;
  }
};