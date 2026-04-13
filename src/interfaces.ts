export interface Link {
  id?: number;
  url: string;
  title: string;
  description: string;
  archived: number;
  collection_id: number | null;
  created_at: string;
  tags: string[];
}

export interface Collection {
  id?: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export interface TagCount {
  name: string;
  count: number;
}

export type Tab = "unread" | "archived";
