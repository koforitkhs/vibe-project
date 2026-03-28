export interface Todo {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  date: string; // 'YYYY-MM-DD'
  created_at: string; // ISO 8601
}

export interface TodoCreateInput {
  title: string;
  date: string; // 'YYYY-MM-DD'
}

export interface TodoUpdateInput {
  title?: string;
  is_completed?: boolean;
}
