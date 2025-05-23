import { read, utils, writeFile, WorkBook, WorkSheet } from 'xlsx';
import { ExcelLead } from '../types/excel';

export const validateExcelHeaders = (headers: string[]): boolean => {
  const requiredHeaders = [
    'First Name',
    'Last Name',
    'Title',
    'Company',
    'Company Name for Emails',
    'Email',
    '# Employees',
    'Industry',
    'Person Linkedin Url',
    'City',
    'State'
  ];

  return requiredHeaders.every(header => headers.includes(header));
};

export const createExcelTemplate = () => {
  const headers = [
    'First Name',
    'Last Name',
    'Title',
    'Company',
    'Company Name for Emails',
    'Email',
    '# Employees',
    'Industry',
    'Person Linkedin Url',
    'City',
    'State'
  ];

  const exampleRow = [
    'John',
    'Doe',
    'Software Engineer',
    'Tech Corp',
    'Tech Corp Inc',
    'john.doe@techcorp.com',
    '100-500',
    'Technology',
    'https://linkedin.com/in/johndoe',
    'San Francisco',
    'CA'
  ];

  const ws: WorkSheet = utils.aoa_to_sheet([headers, exampleRow]);
  const colWidths = headers.map((_, i) => ({ wch: i === 8 ? 40 : 20 }));
  ws['!cols'] = colWidths;

  const wb: WorkBook = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Leads Template');
  writeFile(wb, `apollo_leads_template_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const processExcelFile = async (file: File): Promise<ExcelLead[]> => {
  const data = await file.arrayBuffer();
  const workbook = read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return utils.sheet_to_json<ExcelLead>(worksheet);
};