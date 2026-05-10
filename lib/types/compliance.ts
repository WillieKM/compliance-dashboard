export type FacilityType = 'HOME_CARE' | 'AFH' | 'ASSISTED_LIVING' | 'MULTI_SERVICE';

export type AlertPriority = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ComplianceAlert {
  id: string;
  priority: AlertPriority;
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: Date;
  resolved: boolean;
}

export type StaffComplianceStatus = 'COMPLIANT' | 'REVIEW' | 'OVERDUE';

export interface StaffComplianceRecord {
  id: string;
  name: string;
  role: string;
  completionPercentage: number;
  expiringDocuments: number;
  expiredDocuments: number;
  status: StaffComplianceStatus;
}

export type ResidentStatus = 'compliant' | 'review' | 'overdue';

export interface ResidentRecord {
  id: string;
  name: string;
  admittedDate: string;
  status: ResidentStatus;
  totalDocs: number;
  pendingDocs: number;
}
