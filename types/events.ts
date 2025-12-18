// Event types matching backend models
export type EventStatus = 'active' | 'cancelled' | 'completed' | 'draft';

export type TicketType = {
  name: string;
  price: number;
  quantity: number;
  available: number;
};

export type Event = {
  event_id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string; // ISO datetime string
  ticket_types: TicketType[];
  status: EventStatus;
  image_url?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
};

export type EventCreate = {
  title: string;
  description: string;
  venue: string;
  event_date: string;
  ticket_types: TicketType[];
  status?: EventStatus;
  image_url?: string;
};

export type EventUpdate = {
  title?: string;
  description?: string;
  venue?: string;
  event_date?: string;
  ticket_types?: TicketType[];
  status?: EventStatus;
  image_url?: string;
};

