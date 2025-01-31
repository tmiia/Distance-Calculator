export interface Hospital {
  name: string;
  address: string;
}

export interface Agency {
  name: string;
  address: string;
}

export interface AgencyResult {
  hospitalName: string;
  agencies: string[];
  loading?: boolean;
  error?: string;
}

declare global {
  interface Window {
    google: any;
  }
}
