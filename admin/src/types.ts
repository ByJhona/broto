export type AppRole = 'moderator' | 'admin';

export type ReportStatus = 'open' | 'dismissed' | 'actioned';

export type ReportReason = 'spam' | 'inappropriate' | 'scam' | 'other';

export type ContentType = 'post' | 'comment' | 'listing' | 'event';

export type Profile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
};

export type ReportedPost = {
  id: string;
  caption: string | null;
  image_urls: string[];
  created_at: string;
  deleted_at: string | null;
  author: Profile | null;
};

export type ReportedComment = {
  id: string;
  text: string | null;
  photo_url: string | null;
  created_at: string;
  deleted_at: string | null;
  author: Profile | null;
};

export type ContentReport = {
  id: string;
  reason: ReportReason;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  post_id: string | null;
  comment_id: string | null;
  reporter: Profile | null;
  post: ReportedPost | null;
  comment: ReportedComment | null;
};

export type ModerationActionType =
  | 'hide_content'
  | 'resolve_report'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'set_role'
  | 'remove_role';

export type ModerationAction = {
  id: string;
  moderator_id: string | null;
  action: ModerationActionType;
  target_user_id: string | null;
  content_type: ContentType | null;
  reason: string | null;
  details: { days?: number | null; role?: AppRole; status?: ReportStatus };
  created_at: string;
};

export type Suspension = {
  user_id: string;
  banned_until: string;
};

export type UserRole = {
  user_id: string;
  role: AppRole;
  granted_at: string;
};
