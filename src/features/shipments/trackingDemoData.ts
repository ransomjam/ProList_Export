import type { ShipmentWithItems } from '@/mocks/seeds';

export type TrackingStatus = 'Planned' | 'In transit' | 'Exception' | 'Delivered';
export type TrackingSeverity = 'low' | 'medium' | 'high';
export type TrackingMode = 'SEA' | 'AIR' | 'ROAD';

export interface TrackingMilestoneSeed {
  id: string;
  label: string;
  location: string;
  plannedAt: string;
  actualAt?: string;
  delayDays?: number;
  note?: string;
}

export interface TrackingAttachment {
  id: string;
  label: string;
  fileName: string;
}

export interface TrackingExceptionSeed {
  id: string;
  severity: TrackingSeverity;
  message: string;
  detail?: string;
  occurredAt: string;
}

export interface TrackingActivitySeed {
  id: string;
  actor: string;
  actorInitials: string;
  at: string;
  message: string;
  type: 'milestone' | 'note' | 'exception' | 'eta';
}

export interface TrackingRoutePoint {
  name: string;
  code: string;
  type: 'port' | 'airport' | 'hub' | 'warehouse';
  status: 'completed' | 'in_transit' | 'upcoming';
  eta?: string;
}

export interface TrackingRouteLine {
  origin: TrackingRoutePoint;
  stops: TrackingRoutePoint[];
  destination: TrackingRoutePoint;
  distance: string;
}

export interface TrackingProfile {
  shipmentId: string;
  status: TrackingStatus;
  lastUpdated: string;
  mode: TrackingMode;
  carrier: {
    name: string;
    code?: string;
    contact?: string;
  };
  carrierLogoText: string;
  keyIds: { label: string; value: string }[];
  vessel?: string;
  flight?: string;
  vehicle?: string;
  route: {
    origin: string;
    originDetail: string;
    waypoints?: { name: string; detail: string }[];
    destination: string;
    destinationDetail: string;
  };
  plannedDates: {
    gateIn?: string;
    etd?: string;
    eta?: string;
    delivery?: string;
  };
  attachments: TrackingAttachment[];
  milestones: TrackingMilestoneSeed[];
  routeLine: TrackingRouteLine;
  eta: {
    etaDate: string;
    variance: string;
    basedOn: string;
    statusText: string;
  };
  exceptions: TrackingExceptionSeed[];
  activity: TrackingActivitySeed[];
}

const trackingProfilesList: TrackingProfile[] = [
  {
    shipmentId: 's_5001',
    status: 'In transit',
    lastUpdated: '2025-09-25T14:40:00Z',
    mode: 'SEA',
    carrier: {
      name: 'CMA CGM',
      code: 'CMAC',
      contact: 'operations@cmacgm.example',
    },
    carrierLogoText: 'CMA',
    keyIds: [
      { label: 'Container #', value: 'MSCU 8152467' },
      { label: 'Booking #', value: 'CMACGM-87654' },
      { label: 'Bill of Lading #', value: 'CM2025-44321' },
    ],
    vessel: 'MV Douala Express V.215',
    route: {
      origin: 'Douala, CM',
      originDetail: 'Terminal A, Douala Port',
      waypoints: [
        { name: 'Tanger-Med, MA', detail: 'Transhipment to feeder' },
      ],
      destination: 'Marseille, FR',
      destinationDetail: 'Port of Marseille-Fos',
    },
    plannedDates: {
      gateIn: '2025-09-20T08:30:00Z',
      etd: '2025-09-22T18:00:00Z',
      eta: '2025-10-02T09:00:00Z',
      delivery: '2025-10-05T14:00:00Z',
    },
    attachments: [
      { id: 'att-5001-1', label: 'Bill of Lading', fileName: 'BOL_CM2025-44321.pdf' },
      { id: 'att-5001-2', label: 'Booking confirmation', fileName: 'Booking_CMACGM-87654.pdf' },
      { id: 'att-5001-3', label: 'Insurance cover note', fileName: 'MarineCover-215.pdf' },
    ],
    milestones: [
      {
        id: 'gate-in',
        label: 'Gate in (terminal)',
        location: 'Douala Port',
        plannedAt: '2025-09-20T08:00:00Z',
        actualAt: '2025-09-20T09:12:00Z',
      },
      {
        id: 'loaded-on-vessel',
        label: 'Loaded on vessel',
        location: 'Douala',
        plannedAt: '2025-09-21T18:00:00Z',
        actualAt: '2025-09-21T18:45:00Z',
      },
      {
        id: 'vessel-departed',
        label: 'Vessel departed',
        location: 'Douala',
        plannedAt: '2025-09-22T20:00:00Z',
        actualAt: '2025-09-22T21:10:00Z',
      },
      {
        id: 'transhipment',
        label: 'Transhipment - Tanger',
        location: 'Tanger-Med, MA',
        plannedAt: '2025-09-27T08:00:00Z',
        delayDays: 2,
        note: 'Feeder delayed awaiting berth',
      },
      {
        id: 'arrived-pod',
        label: 'Arrived POD',
        location: 'Marseille, FR',
        plannedAt: '2025-10-02T09:00:00Z',
      },
      {
        id: 'customs-cleared',
        label: 'Customs cleared',
        location: 'Marseille, FR',
        plannedAt: '2025-10-03T10:00:00Z',
      },
      {
        id: 'out-for-delivery',
        label: 'Out for delivery',
        location: 'Marseille, FR',
        plannedAt: '2025-10-04T08:00:00Z',
      },
      {
        id: 'delivered',
        label: 'Delivered',
        location: 'Lyon, FR',
        plannedAt: '2025-10-05T14:00:00Z',
      },
    ],
    routeLine: {
      origin: {
        name: 'Douala Port',
        code: 'CM DLA',
        type: 'port',
        status: 'completed',
        eta: '2025-09-20T09:12:00Z',
      },
      stops: [
        {
          name: 'Tanger-Med Hub',
          code: 'MA TNG',
          type: 'port',
          status: 'in_transit',
          eta: '2025-09-29T12:00:00Z',
        },
      ],
      destination: {
        name: 'Marseille Fos',
        code: 'FR MRS',
        type: 'port',
        status: 'upcoming',
        eta: '2025-10-02T09:00:00Z',
      },
      distance: '5,200 km',
    },
    eta: {
      etaDate: '2025-10-02T09:00:00Z',
      variance: '±1 day',
      basedOn: 'Loaded on vessel — 21 Sep 2025 18:45',
      statusText: 'On track',
    },
    exceptions: [
      {
        id: 'exc-5001-1',
        severity: 'low',
        message: 'Departure delayed by 1 day (carrier advisory)',
        detail: 'Revised ETD confirmed by CMA CGM documentation team.',
        occurredAt: '2025-09-22T12:00:00Z',
      },
      {
        id: 'exc-5001-2',
        severity: 'medium',
        message: 'Customs hold at destination (clearance pending)',
        detail: 'Broker notified to prepare phytosanitary inspection set.',
        occurredAt: '2025-09-25T09:30:00Z',
      },
    ],
    activity: [
      {
        id: 'act-5001-1',
        actor: 'Jam Ransom',
        actorInitials: 'JR',
        at: '2025-09-22T21:10:00Z',
        message: 'Marked “Vessel departed” as done.',
        type: 'milestone',
      },
      {
        id: 'act-5001-2',
        actor: 'Carrier portal',
        actorInitials: 'CP',
        at: '2025-09-22T12:05:00Z',
        message: 'Departure delayed by 1 day — ETA adjusted automatically.',
        type: 'eta',
      },
      {
        id: 'act-5001-3',
        actor: 'Alex Broker',
        actorInitials: 'AB',
        at: '2025-09-20T09:20:00Z',
        message: 'Uploaded signed Bill of Lading.',
        type: 'note',
      },
    ],
  },
  {
    shipmentId: 's_5002',
    status: 'In transit',
    lastUpdated: '2025-09-24T07:55:00Z',
    mode: 'AIR',
    carrier: {
      name: 'Ethiopian Airlines Cargo',
      code: 'ET',
      contact: 'cargoops@ethiopian.example',
    },
    carrierLogoText: 'ET',
    keyIds: [
      { label: 'AWB #', value: '071-44553321' },
      { label: 'Flight #', value: 'ET923 / ET-ANJ' },
    ],
    flight: 'ET923 via ADD',
    route: {
      origin: 'Douala, CM',
      originDetail: 'Douala International Airport (DLA)',
      waypoints: [
        { name: 'Addis Ababa, ET', detail: 'Transit hub — 6h layover' },
      ],
      destination: 'Stockholm, SE',
      destinationDetail: 'Arlanda Airport (ARN)',
    },
    plannedDates: {
      gateIn: '2025-09-23T05:00:00Z',
      etd: '2025-09-23T09:20:00Z',
      eta: '2025-09-24T17:40:00Z',
      delivery: '2025-09-25T10:00:00Z',
    },
    attachments: [
      { id: 'att-5002-1', label: 'Master AWB', fileName: 'MAWB-07144553321.pdf' },
      { id: 'att-5002-2', label: 'Booking confirmation', fileName: 'Booking_ET923.pdf' },
    ],
    milestones: [
      {
        id: 'cargo-received',
        label: 'Cargo received at warehouse',
        location: 'DLA Cargo Village',
        plannedAt: '2025-09-22T15:00:00Z',
        actualAt: '2025-09-22T15:30:00Z',
      },
      {
        id: 'flight-departed-dla',
        label: 'Flight departed Douala',
        location: 'Douala International',
        plannedAt: '2025-09-23T09:20:00Z',
        actualAt: '2025-09-23T09:32:00Z',
      },
      {
        id: 'transit-addis',
        label: 'Transit at Addis Ababa',
        location: 'Bole International, ADD',
        plannedAt: '2025-09-23T18:20:00Z',
        actualAt: '2025-09-23T18:05:00Z',
      },
      {
        id: 'flight-departed-addis',
        label: 'Flight departed Addis',
        location: 'Addis Ababa, ET',
        plannedAt: '2025-09-24T00:30:00Z',
      },
      {
        id: 'arrived-destination',
        label: 'Arrived destination airport',
        location: 'Stockholm Arlanda, SE',
        plannedAt: '2025-09-24T17:40:00Z',
      },
      {
        id: 'customs-cleared',
        label: 'Customs cleared',
        location: 'Stockholm, SE',
        plannedAt: '2025-09-25T05:30:00Z',
      },
      {
        id: 'delivered',
        label: 'Delivered to consignee',
        location: 'Nordic Trade AB, Stockholm',
        plannedAt: '2025-09-25T10:00:00Z',
      },
    ],
    routeLine: {
      origin: {
        name: 'Douala Airport',
        code: 'CM DLA',
        type: 'airport',
        status: 'completed',
        eta: '2025-09-23T09:32:00Z',
      },
      stops: [
        {
          name: 'Addis Ababa',
          code: 'ET ADD',
          type: 'airport',
          status: 'completed',
          eta: '2025-09-23T18:05:00Z',
        },
      ],
      destination: {
        name: 'Stockholm Arlanda',
        code: 'SE ARN',
        type: 'airport',
        status: 'upcoming',
        eta: '2025-09-24T17:40:00Z',
      },
      distance: '8,140 km',
    },
    eta: {
      etaDate: '2025-09-24T17:40:00Z',
      variance: '±4 hours',
      basedOn: 'Transit at Addis — 23 Sep 2025 18:05',
      statusText: 'On track',
    },
    exceptions: [
      {
        id: 'exc-5002-1',
        severity: 'low',
        message: 'Dry ice replenished at ADD',
        detail: 'Handled by airline warehouse — no action required.',
        occurredAt: '2025-09-23T19:10:00Z',
      },
    ],
    activity: [
      {
        id: 'act-5002-1',
        actor: 'Carrier portal',
        actorInitials: 'CP',
        at: '2025-09-23T18:05:00Z',
        message: 'Transit scan completed at Addis Ababa hub.',
        type: 'milestone',
      },
      {
        id: 'act-5002-2',
        actor: 'Nordic Trade',
        actorInitials: 'NT',
        at: '2025-09-22T16:40:00Z',
        message: 'Consignee notified of arrival schedule.',
        type: 'note',
      },
    ],
  },
  {
    shipmentId: 's_5003',
    status: 'Delivered',
    lastUpdated: '2025-09-18T11:05:00Z',
    mode: 'SEA',
    carrier: {
      name: 'MSC',
      code: 'MSCU',
      contact: 'ops@msc.example',
    },
    carrierLogoText: 'MSC',
    keyIds: [
      { label: 'Container #', value: 'MSCU 9145563' },
      { label: 'Booking #', value: 'MSC-556781' },
      { label: 'Bill of Lading #', value: 'MS2025-11234' },
    ],
    vessel: 'MSC Matadi Spirit V.031',
    route: {
      origin: 'Douala, CM',
      originDetail: 'Multipurpose Terminal, Douala',
      waypoints: [
        { name: 'Valencia, ES', detail: 'Transhipment to EU mainline' },
      ],
      destination: 'Genoa, IT',
      destinationDetail: 'Port of Genoa',
    },
    plannedDates: {
      gateIn: '2025-08-28T07:30:00Z',
      etd: '2025-08-30T16:00:00Z',
      eta: '2025-09-15T08:30:00Z',
      delivery: '2025-09-17T13:00:00Z',
    },
    attachments: [
      { id: 'att-5003-1', label: 'Bill of Lading', fileName: 'BOL_MS2025-11234.pdf' },
      { id: 'att-5003-2', label: 'Delivery order', fileName: 'Delivery_MS2025-11234.pdf' },
    ],
    milestones: [
      {
        id: 'gate-in',
        label: 'Gate in (terminal)',
        location: 'Douala Port',
        plannedAt: '2025-08-28T07:00:00Z',
        actualAt: '2025-08-28T07:10:00Z',
      },
      {
        id: 'loaded-on-vessel',
        label: 'Loaded on vessel',
        location: 'Douala',
        plannedAt: '2025-08-29T18:00:00Z',
        actualAt: '2025-08-29T18:22:00Z',
      },
      {
        id: 'vessel-departed',
        label: 'Vessel departed',
        location: 'Douala',
        plannedAt: '2025-08-30T16:00:00Z',
        actualAt: '2025-08-30T16:35:00Z',
      },
      {
        id: 'transhipment',
        label: 'Transhipment - Valencia',
        location: 'Valencia, ES',
        plannedAt: '2025-09-06T10:00:00Z',
        actualAt: '2025-09-06T09:40:00Z',
      },
      {
        id: 'arrived-pod',
        label: 'Arrived POD',
        location: 'Genoa, IT',
        plannedAt: '2025-09-15T08:30:00Z',
        actualAt: '2025-09-14T22:15:00Z',
      },
      {
        id: 'customs-cleared',
        label: 'Customs cleared',
        location: 'Genoa, IT',
        plannedAt: '2025-09-16T09:00:00Z',
        actualAt: '2025-09-15T16:30:00Z',
      },
      {
        id: 'delivered',
        label: 'Delivered',
        location: 'Mediterraneo SpA, Milan',
        plannedAt: '2025-09-17T13:00:00Z',
        actualAt: '2025-09-17T11:45:00Z',
      },
    ],
    routeLine: {
      origin: {
        name: 'Douala Port',
        code: 'CM DLA',
        type: 'port',
        status: 'completed',
        eta: '2025-08-28T07:10:00Z',
      },
      stops: [
        {
          name: 'Valencia',
          code: 'ES VLC',
          type: 'port',
          status: 'completed',
          eta: '2025-09-06T09:40:00Z',
        },
      ],
      destination: {
        name: 'Genoa',
        code: 'IT GOA',
        type: 'port',
        status: 'completed',
        eta: '2025-09-15T16:30:00Z',
      },
      distance: '5,860 km',
    },
    eta: {
      etaDate: '2025-09-15T08:30:00Z',
      variance: 'Confirmed',
      basedOn: 'Delivered — 17 Sep 2025 11:45',
      statusText: 'Delivered',
    },
    exceptions: [
      {
        id: 'exc-5003-1',
        severity: 'low',
        message: 'Cold chain logger within range',
        detail: 'Automated check-in from temperature logger.',
        occurredAt: '2025-09-05T08:00:00Z',
      },
    ],
    activity: [
      {
        id: 'act-5003-1',
        actor: 'Carrier portal',
        actorInitials: 'CP',
        at: '2025-09-17T11:45:00Z',
        message: 'Proof of delivery captured in Genoa.',
        type: 'milestone',
      },
      {
        id: 'act-5003-2',
        actor: 'Mediterraneo SpA',
        actorInitials: 'MS',
        at: '2025-09-17T12:00:00Z',
        message: 'Consignee confirmed receipt of documents.',
        type: 'note',
      },
    ],
  },
  {
    shipmentId: 's_5004',
    status: 'Exception',
    lastUpdated: '2025-09-26T08:45:00Z',
    mode: 'SEA',
    carrier: {
      name: 'Maersk',
      code: 'MSK',
      contact: 'support@maersk.example',
    },
    carrierLogoText: 'MAE',
    keyIds: [
      { label: 'Container #', value: 'MSKU 7744012' },
      { label: 'Booking #', value: 'MSK-99882' },
      { label: 'Bill of Lading #', value: 'MSK2025-88901' },
    ],
    vessel: 'Maersk Douala Star V.118',
    route: {
      origin: 'Kribi, CM',
      originDetail: 'Kribi Container Terminal',
      waypoints: [
        { name: 'Algeciras, ES', detail: 'Relay hub' },
      ],
      destination: 'Felixstowe, UK',
      destinationDetail: 'Port of Felixstowe',
    },
    plannedDates: {
      gateIn: '2025-09-18T06:00:00Z',
      etd: '2025-09-19T19:00:00Z',
      eta: '2025-10-04T11:30:00Z',
      delivery: '2025-10-06T09:00:00Z',
    },
    attachments: [
      { id: 'att-5004-1', label: 'Bill of Lading draft', fileName: 'Draft_BOL_MSK2025-88901.pdf' },
      { id: 'att-5004-2', label: 'Export customs ref', fileName: 'EX-DECL-88901.pdf' },
    ],
    milestones: [
      {
        id: 'gate-in',
        label: 'Gate in (terminal)',
        location: 'Kribi Terminal',
        plannedAt: '2025-09-18T06:00:00Z',
        actualAt: '2025-09-18T05:45:00Z',
      },
      {
        id: 'loaded-on-vessel',
        label: 'Loaded on vessel',
        location: 'Kribi',
        plannedAt: '2025-09-19T17:00:00Z',
        actualAt: '2025-09-19T17:22:00Z',
      },
      {
        id: 'vessel-departed',
        label: 'Vessel departed',
        location: 'Kribi',
        plannedAt: '2025-09-19T19:00:00Z',
        actualAt: '2025-09-19T19:30:00Z',
      },
      {
        id: 'transhipment',
        label: 'Transhipment - Algeciras',
        location: 'Algeciras, ES',
        plannedAt: '2025-09-26T06:00:00Z',
        delayDays: 3,
        note: 'Container selected for customs scan',
      },
      {
        id: 'arrived-pod',
        label: 'Arrived POD',
        location: 'Felixstowe, UK',
        plannedAt: '2025-10-04T11:30:00Z',
      },
      {
        id: 'customs-cleared',
        label: 'Customs cleared',
        location: 'Felixstowe, UK',
        plannedAt: '2025-10-05T08:30:00Z',
      },
      {
        id: 'out-for-delivery',
        label: 'Out for delivery',
        location: 'Felixstowe, UK',
        plannedAt: '2025-10-06T06:00:00Z',
      },
      {
        id: 'delivered',
        label: 'Delivered',
        location: 'Atlantic Imports, London',
        plannedAt: '2025-10-06T09:00:00Z',
      },
    ],
    routeLine: {
      origin: {
        name: 'Kribi Terminal',
        code: 'CM KBI',
        type: 'port',
        status: 'completed',
        eta: '2025-09-19T19:30:00Z',
      },
      stops: [
        {
          name: 'Algeciras',
          code: 'ES ALG',
          type: 'port',
          status: 'in_transit',
          eta: '2025-09-29T09:00:00Z',
        },
      ],
      destination: {
        name: 'Felixstowe',
        code: 'UK FXT',
        type: 'port',
        status: 'upcoming',
        eta: '2025-10-04T11:30:00Z',
      },
      distance: '6,180 km',
    },
    eta: {
      etaDate: '2025-10-07T12:00:00Z',
      variance: 'Delayed +2 days',
      basedOn: 'Customs scan pending in Algeciras',
      statusText: 'Exception',
    },
    exceptions: [
      {
        id: 'exc-5004-1',
        severity: 'medium',
        message: 'Transhipment delayed — customs scan at Algeciras',
        detail: 'Container held for X-ray inspection. Await carrier release.',
        occurredAt: '2025-09-25T17:45:00Z',
      },
      {
        id: 'exc-5004-2',
        severity: 'high',
        message: 'Additional phytosanitary docs requested by UK Border Force',
        detail: 'Need broker to upload COO + Phyto before arrival.',
        occurredAt: '2025-09-26T08:45:00Z',
      },
    ],
    activity: [
      {
        id: 'act-5004-1',
        actor: 'Maersk portal',
        actorInitials: 'MP',
        at: '2025-09-26T08:45:00Z',
        message: 'Hold placed pending customs scan — ETA pushed by 2 days.',
        type: 'exception',
      },
      {
        id: 'act-5004-2',
        actor: 'Jam Ransom',
        actorInitials: 'JR',
        at: '2025-09-26T09:10:00Z',
        message: 'Requested docs from compliance team.',
        type: 'note',
      },
    ],
  },
  {
    shipmentId: 's_5005',
    status: 'Planned',
    lastUpdated: '2025-09-21T10:12:00Z',
    mode: 'AIR',
    carrier: {
      name: 'Lufthansa Cargo',
      code: 'LH',
      contact: 'support@lhcargo.example',
    },
    carrierLogoText: 'LH',
    keyIds: [
      { label: 'AWB #', value: '020-77881234' },
      { label: 'Flight #', value: 'LH8635' },
    ],
    flight: 'LH8635 via FRA',
    route: {
      origin: 'Douala, CM',
      originDetail: 'Douala International Airport (DLA)',
      waypoints: [
        { name: 'Frankfurt, DE', detail: 'Consolidation hub' },
      ],
      destination: 'Berlin, DE',
      destinationDetail: 'BER Cargo Center',
    },
    plannedDates: {
      gateIn: '2025-09-27T04:30:00Z',
      etd: '2025-09-27T08:10:00Z',
      eta: '2025-09-28T16:45:00Z',
      delivery: '2025-09-29T09:30:00Z',
    },
    attachments: [
      { id: 'att-5005-1', label: 'Draft AWB', fileName: 'Draft_AWB_02077881234.pdf' },
      { id: 'att-5005-2', label: 'Export packing list', fileName: 'PackingList_PL-2025-EX-0005.pdf' },
    ],
    milestones: [
      {
        id: 'booking-confirmed',
        label: 'Booking confirmed',
        location: 'Lufthansa cargo desk',
        plannedAt: '2025-09-20T10:00:00Z',
        actualAt: '2025-09-20T11:05:00Z',
      },
      {
        id: 'cargo-received',
        label: 'Cargo to be delivered to warehouse',
        location: 'DLA Cargo Village',
        plannedAt: '2025-09-26T18:00:00Z',
      },
      {
        id: 'flight-departed',
        label: 'Flight departs Douala',
        location: 'Douala International',
        plannedAt: '2025-09-27T08:10:00Z',
      },
      {
        id: 'arrived-frankfurt',
        label: 'Arrived Frankfurt hub',
        location: 'FRA Cargo Center',
        plannedAt: '2025-09-27T20:20:00Z',
      },
      {
        id: 'arrived-destination',
        label: 'Arrived Berlin',
        location: 'BER Cargo Center',
        plannedAt: '2025-09-28T16:45:00Z',
      },
      {
        id: 'delivered',
        label: 'Delivered to consignee',
        location: 'German Trading GmbH, Berlin',
        plannedAt: '2025-09-29T09:30:00Z',
      },
    ],
    routeLine: {
      origin: {
        name: 'Douala Airport',
        code: 'CM DLA',
        type: 'airport',
        status: 'completed',
        eta: '2025-09-20T11:05:00Z',
      },
      stops: [
        {
          name: 'Frankfurt',
          code: 'DE FRA',
          type: 'airport',
          status: 'upcoming',
          eta: '2025-09-27T20:20:00Z',
        },
      ],
      destination: {
        name: 'Berlin',
        code: 'DE BER',
        type: 'airport',
        status: 'upcoming',
        eta: '2025-09-28T16:45:00Z',
      },
      distance: '5,470 km',
    },
    eta: {
      etaDate: '2025-09-28T16:45:00Z',
      variance: 'Planned schedule',
      basedOn: 'Booking confirmed — 20 Sep 2025 11:05',
      statusText: 'Planned',
    },
    exceptions: [],
    activity: [
      {
        id: 'act-5005-1',
        actor: 'Jam Ransom',
        actorInitials: 'JR',
        at: '2025-09-21T10:12:00Z',
        message: 'Confirmed uplift with Lufthansa desk and shared HS codes.',
        type: 'note',
      },
    ],
  },
];

export const trackingProfiles = trackingProfilesList.reduce<Record<string, TrackingProfile>>((acc, profile) => {
  acc[profile.shipmentId] = profile;
  return acc;
}, {});

const defaultProfile = (shipment: ShipmentWithItems): TrackingProfile => ({
  shipmentId: shipment.id,
  status: 'Planned',
  lastUpdated: new Date().toISOString(),
  mode: shipment.mode,
  carrier: {
    name: 'Carrier to be confirmed',
  },
  carrierLogoText: shipment.mode.slice(0, 2),
  keyIds: [],
  route: {
    origin: shipment.route.split('→')[0]?.trim() || 'Origin TBD',
    originDetail: 'Awaiting booking',
    destination: shipment.route.split('→')[1]?.trim() || 'Destination TBD',
    destinationDetail: 'Awaiting booking',
  },
  plannedDates: {},
  attachments: [],
  milestones: [],
  routeLine: {
    origin: {
      name: 'Origin',
      code: shipment.route.split('→')[0]?.trim() || 'OR',
      type: shipment.mode === 'AIR' ? 'airport' : 'port',
      status: 'completed',
      eta: new Date().toISOString(),
    },
    stops: [],
    destination: {
      name: 'Destination',
      code: shipment.route.split('→')[1]?.trim() || 'DEST',
      type: shipment.mode === 'AIR' ? 'airport' : 'port',
      status: 'upcoming',
      eta: new Date().toISOString(),
    },
    distance: 'TBC',
  },
  eta: {
    etaDate: new Date().toISOString(),
    variance: 'TBC',
    basedOn: 'Awaiting schedule',
    statusText: 'Planned',
  },
  exceptions: [],
  activity: [],
});

export const getTrackingProfile = (
  shipmentId: string,
  shipment?: ShipmentWithItems
): TrackingProfile => {
  const profile = trackingProfiles[shipmentId];
  if (profile) {
    return profile;
  }
  if (shipment) {
    return defaultProfile(shipment);
  }
  return {
    shipmentId,
    status: 'Planned',
    lastUpdated: new Date().toISOString(),
    mode: 'SEA',
    carrier: { name: 'Carrier to be confirmed' },
    carrierLogoText: 'PL',
    keyIds: [],
    route: {
      origin: 'Origin',
      originDetail: 'Awaiting booking',
      destination: 'Destination',
      destinationDetail: 'Awaiting booking',
    },
    plannedDates: {},
    attachments: [],
    milestones: [],
    routeLine: {
      origin: {
        name: 'Origin',
        code: 'OR',
        type: 'port',
        status: 'completed',
        eta: new Date().toISOString(),
      },
      stops: [],
      destination: {
        name: 'Destination',
        code: 'DEST',
        type: 'port',
        status: 'upcoming',
        eta: new Date().toISOString(),
      },
      distance: 'TBC',
    },
    eta: {
      etaDate: new Date().toISOString(),
      variance: 'TBC',
      basedOn: 'Awaiting schedule',
      statusText: 'Planned',
    },
    exceptions: [],
    activity: [],
  };
};

export const listTrackingProfiles = () => trackingProfilesList;
