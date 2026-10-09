export type AppRole = 'moderator' | 'admin';

export type ReportStatus = 'open' | 'dismissed' | 'actioned';

export type ReportReason = 'spam' | 'inappropriate' | 'scam' | 'other';

export type ContentType = 'post' | 'comment' | 'listing' | 'event';

export type ReportTargetType = ContentType | 'message' | 'user';

export type PenaltyKind = 'warning' | 'restriction' | 'suspension' | 'ban';

export type Profile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
};

type ReportedRow = {
  id: string;
  created_at: string;
  author: Profile | null;
};

export type ReportedPost = ReportedRow & { caption: string | null; image_urls: string[]; deleted_at: string | null };
export type ReportedComment = ReportedRow & { text: string | null; photo_url: string | null; deleted_at: string | null };
export type ReportedListing = ReportedRow & { title: string; description: string | null; photo_urls: string[]; deleted_at: string | null };
export type ReportedEvent = ReportedRow & { title: string; description: string | null; photo_url: string | null; deleted_at: string | null };
export type ReportedMessage = ReportedRow & { body: string | null; photo_url: string | null };

export type ContentReport = {
  id: string;
  reason: ReportReason;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  post_id: string | null;
  comment_id: string | null;
  listing_id: string | null;
  event_id: string | null;
  message_id: string | null;
  reported_user_id: string | null;
  reporter: Profile | null;
  post: ReportedPost | null;
  comment: ReportedComment | null;
  listing: ReportedListing | null;
  event: ReportedEvent | null;
  message: ReportedMessage | null;
  reported_user: Profile | null;
};

export type Penalty = {
  id: string;
  user_id: string;
  kind: PenaltyKind;
  reason: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type ModerationActionType =
  | 'hide_content'
  | 'resolve_report'
  | 'suspend_user'
  | 'unsuspend_user'
  | 'set_role'
  | 'remove_role'
  | 'warn_user'
  | 'restrict_user'
  | 'ban_user'
  | 'revoke_penalty';

export type ModerationAction = {
  id: string;
  moderator_id: string | null;
  action: ModerationActionType;
  target_user_id: string | null;
  content_type: ContentType | null;
  reason: string | null;
  details: { days?: number | null; role?: AppRole; status?: ReportStatus; count?: number };
  created_at: string;
};

export type UserRole = {
  user_id: string;
  role: AppRole;
  granted_at: string;
};
