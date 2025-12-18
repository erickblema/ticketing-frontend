// Order types matching backend models
export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export type OrderItem = {
  ticket_type: string;
  quantity: number;
  price: number;
  subtotal: number;
};

export type Order = {
  order_id: string;
  user_id: string;
  event_id: string;
  items: OrderItem[];
  total_amount: number;
  stripe_fees: number;
  net_amount: number;
  status: OrderStatus;
  stripe_payment_intent_id?: string;
  client_secret?: string; // For mobile payment
  stripe_checkout_session_id?: string;
  checkout_url?: string; // For web checkout
  created_at: string;
  paid_at?: string;
  refunded_amount?: number;
  refunded_at?: string;
};

export type OrderCreate = {
  event_id: string;
  items: OrderItem[];
  use_mobile_payment?: boolean;
};

export type QRCodeResponse = {
  qr_token: string;
  qr_image_base64: string;
  order_id: string;
  event_id: string;
  quantity: number;
};

