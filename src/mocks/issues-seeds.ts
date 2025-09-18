// Seed data for Issues, Comments, and Events

import type { Issue, IssueComment, Event } from './types';

// Seed Issues (2-3 examples tied to demo shipments)
export const seedIssues: Issue[] = [
  {
    id: 'issue_1',
    shipment_id: 's_5001',
    title: 'Incorrect HS Code on Invoice',
    doc_key: 'INVOICE',
    severity: 'high',
    status: 'open',
    assignee_id: 'u_2', // Alex Broker
    created_at: '2025-09-15T10:30:00Z',
    updated_at: '2025-09-15T14:20:00Z',
  },
  {
    id: 'issue_2',
    shipment_id: 's_5002',
    title: 'Missing phytosanitary certificate',
    doc_key: 'PHYTO',
    severity: 'critical',
    status: 'in_progress',
    assignee_id: 'u_1', // Jam Ransom
    created_at: '2025-09-12T08:15:00Z',
    updated_at: '2025-09-16T16:45:00Z',
  },
  {
    id: 'issue_3',
    shipment_id: 's_5003',
    title: 'Buyer address incomplete on packing list',
    doc_key: 'PACKING_LIST',
    severity: 'medium',
    status: 'resolved',
    assignee_id: 'u_3', // Sam Finance
    created_at: '2025-09-10T14:00:00Z',
    updated_at: '2025-09-14T11:30:00Z',
  },
];

// Seed Issue Comments
export const seedIssueComments: IssueComment[] = [
  {
    id: 'comment_1',
    issue_id: 'issue_1',
    author_id: 'u_2',
    body: 'Reviewed the invoice - the HS code should be 180100 instead of 090111. This needs to be corrected before submission.',
    created_at: '2025-09-15T11:00:00Z',
  },
  {
    id: 'comment_2',
    issue_id: 'issue_1',
    author_id: 'u_1',
    body: 'Agreed. I\'ll regenerate the invoice with the correct HS code.',
    created_at: '2025-09-15T14:20:00Z',
  },
  {
    id: 'comment_3',
    issue_id: 'issue_2',
    author_id: 'u_1',
    body: 'Contacted the local phytosanitary authority. They confirmed the certificate will be ready by tomorrow.',
    created_at: '2025-09-16T09:30:00Z',
  },
  {
    id: 'comment_4',
    issue_id: 'issue_2',
    author_id: 'u_2',
    body: 'Perfect. Once we have it, I can proceed with the customs declaration.',
    created_at: '2025-09-16T16:45:00Z',
  },
  {
    id: 'comment_5',
    issue_id: 'issue_3',
    author_id: 'u_3',
    body: 'Updated the packing list with complete buyer address including postal code.',
    created_at: '2025-09-14T10:15:00Z',
  },
  {
    id: 'comment_6',
    issue_id: 'issue_3',
    author_id: 'u_1',
    body: 'Looks good now. Marking as resolved.',
    created_at: '2025-09-14T11:30:00Z',
  },
];

// Seed Events (timeline entries)
export const seedEvents: Event[] = [
  {
    id: 'event_1',
    shipment_id: 's_5001',
    type: 'shipment_created',
    at: '2025-09-10T08:00:00Z',
    by: 'u_1',
    payload: { reference: 'PL-2025-EX-0001' },
  },
  {
    id: 'event_2',
    shipment_id: 's_5001',
    type: 'doc_generated',
    at: '2025-09-10T10:30:00Z',
    by: 'u_1',
    payload: { doc_key: 'INVOICE', version: 1 },
  },
  {
    id: 'event_3',
    shipment_id: 's_5001',
    type: 'issue_opened',
    at: '2025-09-15T10:30:00Z',
    by: 'u_2',
    payload: { issue_id: 'issue_1', title: 'Incorrect HS Code on Invoice' },
  },
  {
    id: 'event_4',
    shipment_id: 's_5001',
    type: 'issue_commented',
    at: '2025-09-15T11:00:00Z',
    by: 'u_2',
    payload: { issue_id: 'issue_1' },
  },
  {
    id: 'event_5',
    shipment_id: 's_5002',
    type: 'shipment_created',
    at: '2025-09-12T07:00:00Z',
    by: 'u_1',
    payload: { reference: 'PL-2025-EX-0002' },
  },
  {
    id: 'event_6',
    shipment_id: 's_5002',
    type: 'shipment_submitted',
    at: '2025-09-12T08:00:00Z',
    by: 'u_1',
  },
  {
    id: 'event_7',
    shipment_id: 's_5002',
    type: 'issue_opened',
    at: '2025-09-12T08:15:00Z',
    by: 'u_1',
    payload: { issue_id: 'issue_2', title: 'Missing phytosanitary certificate' },
  },
  {
    id: 'event_8',
    shipment_id: 's_5002',
    type: 'issue_status_changed',
    at: '2025-09-16T09:00:00Z',
    by: 'u_1',
    payload: { issue_id: 'issue_2', from_status: 'open', to_status: 'in_progress' },
  },
  {
    id: 'event_9',
    shipment_id: 's_5003',
    type: 'shipment_created',
    at: '2025-09-08T09:00:00Z',
    by: 'u_1',
    payload: { reference: 'PL-2025-EX-0003' },
  },
  {
    id: 'event_10',
    shipment_id: 's_5003',
    type: 'doc_generated',
    at: '2025-09-09T14:00:00Z',
    by: 'u_1',
    payload: { doc_key: 'PACKING_LIST', version: 1 },
  },
  {
    id: 'event_11',
    shipment_id: 's_5003',
    type: 'issue_opened',
    at: '2025-09-10T14:00:00Z',
    by: 'u_3',
    payload: { issue_id: 'issue_3', title: 'Buyer address incomplete on packing list' },
  },
  {
    id: 'event_12',
    shipment_id: 's_5003',
    type: 'doc_approved',
    at: '2025-09-13T16:00:00Z',
    by: 'u_1',
    payload: { doc_key: 'PACKING_LIST', version: 1 },
  },
  {
    id: 'event_13',
    shipment_id: 's_5003',
    type: 'issue_status_changed',
    at: '2025-09-14T11:30:00Z',
    by: 'u_1',
    payload: { issue_id: 'issue_3', from_status: 'open', to_status: 'resolved' },
  },
];