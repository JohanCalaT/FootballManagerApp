export interface News {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  authorId: string;
}

export interface CreateNewsRequest {
  title: string;
  content: string;
}
