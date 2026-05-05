export type LeadType = 'Hot' | 'Warm' | 'Cold';

export interface Lead {
  id: string;
  name: string;
  number: string;
  companyName: string;
  gst: string;
  leadType: LeadType;
  entryDate: string;
  forecastedValue: number;
  convertedValue: number;
  totalOrderValue: number;
  createdBy: string; // User ID
  createdByName: string;
}
