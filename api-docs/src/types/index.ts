export interface ApiServer {
  url: string;
  description: string;
}

export interface ApiConfig {
  serverUrl: string;
  authToken: string;
  lastSyncTime?: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  tag: string;
  summary: string;
  description?: string;
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses?: ApiResponseDefinition[];
}

export interface ApiParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required: boolean;
  schema?: ApiSchema;
  description?: string;
}

export interface ApiRequestBody {
  required: boolean;
  content?: {
    'application/json'?: {
      schema?: ApiSchema;
    };
    'multipart/form-data'?: {
      schema?: ApiSchema;
    };
  };
}

export interface ApiResponseDefinition {
  status: string;
  description: string;
  schema?: ApiSchema;
}

export interface ApiSchema {
  type?: string;
  properties?: Record<string, ApiSchema>;
  $ref?: string;
  description?: string;
  format?: string;
  enum?: (string | number)[];
  items?: ApiSchema;
  nullable?: boolean;
  default?: unknown;
}

export interface TestRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body?: any;
}

export interface TestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  url: string;
}

// 端点摘要（用于侧边栏分组列表展示）
export interface EndpointSummary {
  method: string;
  path: string;
  tag: string;
  summary: string;
  operationId?: string;
  description?: string;
  parameters?: ApiParameter[];
  pathParams?: ApiParameter[];
  queryParams?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses?: Record<string, ApiResponseDefinition>;
}

// 端点分组（按 tag 聚合）
export interface ApiEndpointGroup {
  groupName: string;
  groupDescription?: string;
  endpoints: EndpointSummary[];
}

// 选中的端点标识
export interface SelectedEndpoint {
  method: string;
  path: string;
}

// 视图类型
export type SelectedView = 'overview' | 'endpoint' | 'docs';
