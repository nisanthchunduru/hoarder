export interface LinkRecord {
  id?: number;
  url: string;
  title: string;
  description: string;
  archived: number;
  collection_id: number | null;
  created_at: string;
  tags: string[];
}

export interface CollectionRecord {
  id?: number;
  name: string;
  parent_id: number | null;
  created_at: string;
}
