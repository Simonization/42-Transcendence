import { api } from './index';

export interface Notification {
  id: number;
  userId: number;
  actorId?: number;
  type: 'info' | 'bot_message' | 'system' | 'friend_request' | 'match_result';
  title?: string;
  body: string;
  data?: any;
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  userId: number;
  type: 'info' | 'bot_message' | 'system' | 'friend_request' | 'match_result';
  body: string;
  title?: string;
  data?: any;
}

export interface QueryNotificationsDto {
  type?: 'info' | 'bot_message' | 'system' | 'friend_request' | 'match_result';
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}


export const notificationsApi = {
  getNotifications: async (params?: QueryNotificationsDto): Promise<NotificationsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.unreadOnly !== undefined) queryParams.append('unreadOnly', String(params.unreadOnly));
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const query = queryParams.toString();
    return api<NotificationsResponse>(`/notifications${query ? `?${query}` : ''}`, {
      method: 'GET',
      auth: true,
    });
  },

  getUnreadCount: (): Promise<UnreadCountResponse> => {
    return api<UnreadCountResponse>('/notifications/unread-count', {
      method: 'GET',
      auth: true,
    });
  },

  markAsRead: (notificationId: number): Promise<void> => {
    return api<void>(`/notifications/${notificationId}/read`, {
      method: 'POST',
      auth: true,
    });
  },

  markAllAsRead: (): Promise<void> => {
    return api<void>('/notifications/read-all', {
      method: 'POST',
      auth: true,
    });
  },

  deleteNotification: (notificationId: number): Promise<void> => {
    return api<void>(`/notifications/${notificationId}`, {
      method: 'DELETE',
      auth: true,
    });
  },

  sendNotification: (data: CreateNotificationDto): Promise<Notification> => {
    return api<Notification>('/notifications/send', {
      method: 'POST',
      body: data,
      auth: true,
    });
  },
};
