// Cart types matching backend models
export type CartItem = {
  ticket_type: string;
  quantity: number;
  price: number;
};

export type Cart = {
  cart_id: string;
  event_id: string;
  user_id?: string;
  session_id?: string;
  items: CartItem[];
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export type CartCreate = {
  event_id: string;
  items: CartItem[];
};

