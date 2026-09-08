export type CommunityPostType = 'conquista' | 'duvida' | 'dica';

export type CommunityComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string;
  createdAt: string;
};

export type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl?: string | null;
  postType: CommunityPostType | null;
  createdAt: string;
  imageUrl: string | null;
  caption: string;
  likeCount: number;
  liked: boolean;
  comments: CommunityComment[];
};
