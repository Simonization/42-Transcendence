import { api } from './index';

export type NotificationType = 
  | 'info'
  | 'bot_message'
  | 'system'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'team_invite'
  | 'tournament_started'
  | 'match_result';

export interface Notification {
  id: number;
  userId: number;
  actorId?: number;
  type: NotificationType;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationDto {
  userId: number;
  type: NotificationType;
  body: string;
  title?: string;
  data?: Record<string, unknown>;
}

export interface QueryNotificationsDto {
  type?: NotificationType;
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
